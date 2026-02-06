/**
 * Payroll Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import type { Payroll, Attendance, Employee, EmployeeSalaryHistory } from "@shared/schema";
import { 
  generatePayroll, 
  aggregateAttendance,
  getPayrollDebugInfo,
  logPayrollDebugInfo 
} from "../services/payroll.service";
import { PAYROLL_DEFAULTS } from "../config/constants";

const router = Router();

// =============================================================================
// TYPES
// =============================================================================

type PayrollWithContext = Payroll & {
  contract_basic_salary?: number;
  working_days?: number;
  hours_per_day?: number;
  scheduled_hours?: number;
  name?: string;
  comments?: string;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Apply salary history to employee data for historical accuracy
 * If salary history exists for the month, use those values; otherwise use current employee values
 */
function applyHistoricalSalary(
  employee: Employee, 
  salaryHistoryMap: Map<string, EmployeeSalaryHistory>
): Employee {
  const history = salaryHistoryMap.get(employee.emp_id);
  
  if (!history) {
    // No historical record, use current employee data
    return employee;
  }
  
  // Merge historical salary data with employee data
  return {
    ...employee,
    basic_salary: history.basic_salary,
    other_allowance: history.other_allowance,
    food_allowance_amount: history.food_allowance_amount,
    food_allowance_type: history.food_allowance_type,
    working_hours: history.working_hours,
    ot_rate_normal: history.ot_rate_normal,
    ot_rate_friday: history.ot_rate_friday,
    ot_rate_holiday: history.ot_rate_holiday,
  };
}

/**
 * Enrich payroll records with additional context from employees and attendance
 */
async function enrichPayrollRows(payroll: Payroll[], month?: string): Promise<PayrollWithContext[]> {
  if (payroll.length === 0) {
    return [];
  }

  const attendancePromise = month
    ? storage.getAttendance(month)
    : Promise.resolve<Attendance[]>([]);

  const [employees, attendance] = await Promise.all([
    storage.getEmployees(),
    attendancePromise,
  ]);

  const employeeMap = new Map(employees.map((employee) => [employee.emp_id, employee]));
  const attendanceMap = new Map<string, { workingDays: number; comments: string }>();

  for (const entry of attendance) {
    const current = attendanceMap.get(entry.emp_id) ?? { workingDays: 0, comments: "" };
    current.workingDays += Number(entry.working_days ?? 0);
    if (entry.comments) {
      current.comments = current.comments ? `${current.comments}; ${entry.comments}` : entry.comments;
    }
    attendanceMap.set(entry.emp_id, current);
  }

  return payroll.map((record) => {
    const employee = employeeMap.get(record.emp_id);
    const stats = attendanceMap.get(record.emp_id);
    const hoursPerDay = employee && Number(employee.working_hours) > 0
      ? Number(employee.working_hours)
      : PAYROLL_DEFAULTS.HOURS_PER_DAY;
    const workingDays = stats?.workingDays;
    const contractBasic = employee ? parseFloat(employee.basic_salary) : undefined;
    const scheduledHours = workingDays && hoursPerDay
      ? workingDays * hoursPerDay
      : undefined;

    return {
      ...record,
      name: employee?.name,
      contract_basic_salary: contractBasic,
      working_days: workingDays,
      hours_per_day: hoursPerDay,
      scheduled_hours: scheduledHours,
      comments: stats?.comments ?? "",
    };
  });
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/payroll
 * Get payroll records, optionally filtered by month and/or dept_id
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const deptId = req.query.dept_id != null ? parseInt(String(req.query.dept_id), 10) : undefined;
    const payroll = await storage.getPayroll(month, isNaN(deptId!) ? undefined : deptId);
    const enriched = await enrichPayrollRows(payroll, month);
    res.json(enriched);
  } catch (error) {
    console.error("/api/payroll error:", error);
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
});

/**
 * GET /api/payroll/:empId
 * Get payroll for a specific employee
 */
router.get("/:empId", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const payroll = await storage.getPayrollByEmployee(req.params.empId, month);
    const enriched = await enrichPayrollRows(payroll, month);
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch payroll" });
  }
});

/**
 * PATCH /api/payroll/:empId
 * Update payroll record for an employee
 */
router.patch("/:empId", async (req, res) => {
  try {
    const { month, ...updates } = req.body;
    if (!month) {
      return res.status(400).json({ error: "Month is required" });
    }
    
    const payroll = await storage.updatePayroll(req.params.empId, month, updates);
    if (!payroll) {
      return res.status(404).json({ error: "Payroll record not found" });
    }
    res.json(payroll);
  } catch (error) {
    console.error("Update payroll error:", error);
    res.status(500).json({ error: "Failed to update payroll" });
  }
});

/**
 * POST /api/payroll/generate
 * Generate payroll for a given month. Optional dept_id: generate only for that department; otherwise everyone.
 */
router.post("/generate", async (req, res) => {
  try {
    const { month, useHistoricalSalary = true, dept_id: deptId } = req.body;
    
    if (!month) {
      return res.status(400).json({ error: "Month is required" });
    }
    
    const deptIdNum = deptId != null ? parseInt(String(deptId), 10) : undefined;
    const forDeptOnly = deptIdNum != null && !isNaN(deptIdNum);
    
    // Fetch employees (and optionally filter by department)
    let employeesWithDept = await storage.getEmployeesWithDeptName();
    if (forDeptOnly) {
      const deptEmployees = await storage.getEmployeesByDept(deptIdNum);
      const deptEmpIds = new Set(deptEmployees.map((e) => e.emp_id));
      employeesWithDept = employeesWithDept.filter((e) => deptEmpIds.has(e.emp_id));
    }
    
    const attendances = forDeptOnly
      ? await storage.getAttendance(month, deptIdNum)
      : await storage.getAttendance(month);
    
    // Fetch salary history for the month (if using historical salary)
    let employeesWithSalary = employeesWithDept;
    let usedHistoricalSalary = false;
    
    if (useHistoricalSalary) {
      const salaryHistory = await storage.getAllSalariesForMonth(month);
      
      if (salaryHistory.length > 0) {
        const salaryHistoryMap = new Map(
          salaryHistory.map(s => [s.emp_id, s])
        );
        employeesWithSalary = employeesWithDept.map(emp => ({
          ...applyHistoricalSalary(emp, salaryHistoryMap),
          department_name: emp.department_name,
        }));
        usedHistoricalSalary = true;
        
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Payroll] Using historical salary data for ${salaryHistory.length} employees`);
        }
      } else {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[Payroll] No historical salary data found for ${month}, using current employee salaries`);
        }
      }
    }
    
    const { payrolls, errors } = generatePayroll(employeesWithSalary, attendances, month);
    
    if (process.env.NODE_ENV !== 'production') {
      for (const employee of employeesWithSalary) {
        if (employee.status !== "active") continue;
        const empAttendances = attendances.filter(a => a.emp_id === employee.emp_id && a.month === month);
        if (empAttendances.length === 0) continue;
        const aggregated = aggregateAttendance(empAttendances);
        if (aggregated.workingDays === 0 || aggregated.actualPresentDays === 0) continue;
        const debugInfo = getPayrollDebugInfo(employee, aggregated, month);
        logPayrollDebugInfo(debugInfo);
      }
    }
    
    if (payrolls.length === 0) {
      return res.status(400).json({ 
        error: "No payroll generated", 
        message: forDeptOnly
          ? "No active employees with attendance found in the selected department."
          : "No active employees with attendance found",
        warnings: errors,
        created: [] 
      });
    }
    
    if (forDeptOnly) {
      const deptEmpIds = employeesWithDept.map((e) => e.emp_id);
      await storage.deletePayrollForEmployees(month, deptEmpIds);
    } else {
      await storage.deletePayroll(month);
    }
    
    const created = await storage.bulkCreatePayroll(payrolls);
    
    const response: any = { 
      created,
      count: created.length,
      message: forDeptOnly
        ? `Payroll generated for ${created.length} employee(s) in selected department`
        : `Payroll generated for ${created.length} employee(s)`,
      usedHistoricalSalary,
    };
    
    if (errors.length > 0) {
      response.warnings = errors;
      response.message += `. ${errors.length} employee(s) skipped due to missing attendance.`;
    }
    
    if (usedHistoricalSalary) {
      response.message += ' (Using historical salary data)';
    }
    
    res.json(response);
  } catch (error) {
    console.error("Payroll generation error:", error);
    res.status(500).json({ 
      error: "Failed to generate payroll", 
      details: error instanceof Error ? error.message : String(error) 
    });
  }
});

export default router;
