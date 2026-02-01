/**
 * Payroll Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import type { Payroll, Attendance } from "@shared/schema";
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
 * Get payroll records, optionally filtered by month
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const payroll = await storage.getPayroll(month);
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
 * Generate payroll for all active employees for a given month
 */
router.post("/generate", async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({ error: "Month is required" });
    }
    
    // Fetch all required data
    const employees = await storage.getEmployees();
    const attendances = await storage.getAttendance(month);
    
    console.log(`Generating payroll for ${month}:`);
    console.log(`- Found ${employees.length} employees`);
    console.log(`- Found ${attendances.length} attendance records`);
    
    // Generate payroll using the service
    const { payrolls, errors } = generatePayroll(employees, attendances, month);
    
    // Log debug info for each employee (optional detailed logging)
    for (const employee of employees) {
      if (employee.status !== "active") continue;
      
      const empAttendances = attendances.filter(a => a.emp_id === employee.emp_id && a.month === month);
      if (empAttendances.length === 0) continue;
      
      const aggregated = aggregateAttendance(empAttendances);
      if (aggregated.workingDays === 0 || aggregated.actualPresentDays === 0) continue;
      
      const debugInfo = getPayrollDebugInfo(employee, aggregated, month);
      logPayrollDebugInfo(debugInfo);
    }
    
    console.log(`Generated ${payrolls.length} payroll records`);
    
    if (payrolls.length === 0) {
      return res.status(400).json({ 
        error: "No payroll generated", 
        message: "No active employees with attendance found",
        warnings: errors,
        created: [] 
      });
    }
    
    // Clear existing payroll for this month to avoid duplicates
    await storage.deletePayroll(month);
    console.log(`Cleared existing payroll records for ${month}`);

    // Save payroll records
    const created = await storage.bulkCreatePayroll(payrolls);
    console.log(`Successfully saved ${created.length} payroll records`);
    
    const response: any = { 
      created,
      count: created.length,
      message: `Payroll generated for ${created.length} employee(s)`
    };
    
    if (errors.length > 0) {
      response.warnings = errors;
      response.message += `. ${errors.length} employee(s) skipped due to missing attendance.`;
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
