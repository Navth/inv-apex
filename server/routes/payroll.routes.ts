/**
 * Payroll Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import type { Payroll, Attendance, Employee, EmployeeSalaryHistory, InsertPayroll } from "@shared/schema";
import {
  generatePayroll,
  aggregateAttendance,
  getPayrollDebugInfo,
  logPayrollDebugInfo,
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
 * Apply salary history to employee data for historical accuracy.
 * Uses salary components and, when present, category and accommodation so food allowance
 * is correct for that month (e.g. migrated historical data).
 */
function applyHistoricalSalary(
  employee: Employee,
  history: EmployeeSalaryHistory
): Employee {
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
    ...(history.category != null && history.category !== "" && { category: history.category }),
    ...(history.accommodation != null && history.accommodation !== "" && { accommodation: history.accommodation }),
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
    const { month, useHistoricalSalary = true, overwrite_migrated: overwriteMigrated = false, dept_id: deptId } = req.body;

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
    // Support mid-month increment: 2+ segments per employee → segment-based proration
    let employeesWithSalary = employeesWithDept;
    let usedHistoricalSalary = false;
    const salarySegmentsMap = new Map<string, EmployeeSalaryHistory[]>();

    if (useHistoricalSalary) {
      const built: (Employee & { department_name?: string })[] = [];
      let anyHistorical = false;
      for (const emp of employeesWithDept) {
        const segments = await storage.getSalarySegmentsForMonth(emp.emp_id, month);
        if (segments.length >= 2) {
          built.push({ ...emp, department_name: emp.department_name });
          salarySegmentsMap.set(emp.emp_id, segments);
          anyHistorical = true;
        } else if (segments.length === 1) {
          built.push({
            ...applyHistoricalSalary(emp, segments[0]),
            department_name: emp.department_name,
          });
          anyHistorical = true;
        } else {
          const effective = await storage.getEffectiveSalaryForMonth(emp.emp_id, month);
          if (effective) {
            built.push({
              ...applyHistoricalSalary(emp, effective),
              department_name: emp.department_name,
            });
            anyHistorical = true;
          } else {
            built.push({ ...emp, department_name: emp.department_name });
          }
        }
      }
      employeesWithSalary = built;
      usedHistoricalSalary = anyHistorical;
      if (process.env.NODE_ENV !== "production" && (anyHistorical || salarySegmentsMap.size > 0)) {
        console.log(
          `[Payroll] Historical salary: ${built.length} employees, ${salarySegmentsMap.size} with mid-month increment`
        );
      }
    }

    const { payrolls, errors } = generatePayroll(
      employeesWithSalary,
      attendances,
      month,
      salarySegmentsMap.size > 0 ? salarySegmentsMap : undefined
    );
    
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
    
    // When overwrite_migrated is false, only remove calculated payroll; keep source='migrated' rows
    if (forDeptOnly) {
      const deptEmpIds = employeesWithDept.map((e) => e.emp_id);
      const existing = await storage.getPayroll(month, deptIdNum);
      const toDelete = overwriteMigrated
        ? deptEmpIds
        : existing.filter((p) => (p as { source?: string }).source !== "migrated").map((p) => p.emp_id);
      if (toDelete.length > 0) {
        await storage.deletePayrollForEmployees(month, toDelete);
      }
    } else {
      if (overwriteMigrated) {
        await storage.deletePayroll(month);
      } else {
        await storage.deletePayrollCalculatedOnly(month);
      }
    }

    const payrollsWithSource = payrolls.map((p) => ({ ...p, source: "calculated" as const }));
    const created = await storage.bulkCreatePayroll(payrollsWithSource);
    
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
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/payroll/import
 * Bulk import historical (migrated) payroll. Each record is stored with source='migrated'
 * so it is not overwritten by "Generate payroll" unless overwrite_migrated=true.
 * Body: { payrolls: Array<{ emp_id, month, basic_salary, ot_amount?, food_allowance?, gross_salary, deductions?, net_salary, days_worked?, dues_earned? }> }
 */
router.post("/import", async (req, res) => {
  try {
    const { payrolls: rawPayrolls } = req.body as { payrolls: Record<string, unknown>[] };
    if (!Array.isArray(rawPayrolls) || rawPayrolls.length === 0) {
      return res.status(400).json({ error: "payrolls array is required and must not be empty" });
    }
    const payrolls: InsertPayroll[] = rawPayrolls.map((p: Record<string, unknown>) => ({
      emp_id: String(p.emp_id),
      month: String(p.month),
      basic_salary: String(p.basic_salary ?? 0),
      ot_amount: String(p.ot_amount ?? 0),
      food_allowance: String(p.food_allowance ?? 0),
      gross_salary: String(p.gross_salary ?? 0),
      deductions: String(p.deductions ?? 0),
      net_salary: String(p.net_salary ?? 0),
      days_worked: typeof p.days_worked === "number" ? p.days_worked : 0,
      dues_earned: String(p.dues_earned ?? 0),
      source: "migrated",
    }));
    const byMonth = new Map<string, string[]>();
    for (const p of payrolls) {
      const empIds = byMonth.get(p.month) ?? [];
      if (!empIds.includes(p.emp_id)) empIds.push(p.emp_id);
      byMonth.set(p.month, empIds);
    }
    for (const [month, empIds] of byMonth) {
      await storage.deletePayrollForEmployees(month, empIds);
    }
    const created = await storage.bulkCreatePayroll(payrolls);
    res.status(201).json({
      message: `Imported ${created.length} historical payroll record(s) (source=migrated)`,
      count: created.length,
    });
  } catch (error) {
    console.error("Payroll import error:", error);
    res.status(500).json({
      error: "Failed to import payroll",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
