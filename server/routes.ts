import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertEmployeeSchema, insertAttendanceSchema, insertPayrollSchema, insertLeaveSchema, insertIndemnitySchema, type Payroll, type Attendance } from "@shared/schema";
import { z } from "zod";
import { error } from "console";

type PayrollWithContext = Payroll & {
  contract_basic_salary?: number;
  working_days?: number;
  hours_per_day?: number;
  scheduled_hours?: number;
};

const DEFAULT_PAYROLL_HOURS_PER_DAY = 8;

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
    // Concatenate comments if there are multiple attendance records
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
      : DEFAULT_PAYROLL_HOURS_PER_DAY;
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


export async function registerRoutes(app: Express): Promise<Server> {

  // Authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).send("Username and password required");
      }

      // Simple authentication (in production, use proper password hashing)
      // For now, accept any username with password "admin@123"
      if (password === "admin@123") {
        // Set session/cookie
        res.cookie("auth", "true", { 
          httpOnly: true, 
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
          sameSite: "lax"
        });
        res.json({ success: true, username });
      } else {
        res.status(401).send("Invalid credentials");
      }
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send("Login failed");
    }
  });

  app.post("/api/logout", async (req, res) => {
    try {
      // Clear auth cookie
      res.clearCookie("auth");
      res.json({ success: true });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).send("Logout failed");
    }
  });

  app.get("/api/auth/check", async (req, res) => {
    try {
      // Check if auth cookie exists
      const authCookie = req.cookies?.auth;
      if (authCookie === "true") {
        res.json({ authenticated: true });
      } else {
        res.status(401).json({ authenticated: false });
      }
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ authenticated: false });
    }
  });

//   app.get("/api/health/db", async (req, res) => {
//   try {
//     const url = process.env.DATABASE_URL;
//     if (!url) {
//       return res.json({
//         connected: false,
//         reason: "DATABASE_URL not set",
//         mode: "memory",
//         timestamp: new Date().toISOString(),
//       });
//     }

//     let host: string;
//     let port: number;
//     try {
//       const u = new URL(url);
//       host = u.hostname;
//       port = Number(u.port) || 5432;
//     } catch {
//       return res.json({
//         connected: false,
//         reason: "Invalid DATABASE_URL",
//         mode: "db-configured",
//         timestamp: new Date().toISOString(),
//       });
//     }
//     let dnsOk = false;
//     try {
//       await dns.lookup(host);
//       dnsOk = true;
//     } catch { /* ignore */ }

//     const tcpOk = await new Promise<boolean>((resolve) => {
//       const s = net.createConnection({ host, port, timeout: 2500 });
//       s.once("connect", () => { s.end(); resolve(true); });
//       s.once("timeout", () => { s.destroy(); resolve(false); });
//       s.once("error", () => resolve(false));
//     });
//        let sqlOk = false;
//     try {
//       const pg = await import("pg").catch(() => null as any);
//       if (pg?.Client) {
//         const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
//         await client.connect();
//         await client.query("select 1");
//         await client.end();
//         sqlOk = true;
//       }
//     } catch { /* ignore */ }

//     const connected = sqlOk || (dnsOk && tcpOk);
//     res.json({
//       connected,
//       details: { dnsOk, tcpOk, sqlOk, host, port },
//       mode: "db-configured",
//       timestamp: new Date().toISOString(),
//     });
//   } catch (err: any) {
//     res.status(500).json({ connected: false, error: err?.message || "Unknown error" });
//   }
// });

  
  app.get("/api/employees", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      res.json(employees);
    } catch (error) {
      console.error("/api/employees error:", error);
      res.status(500).json({ error: "Failed to fetch employees" });
    }
  });
  
  app.get("/api/employees/:empId", async (req, res) => {
    try {
      const employee = await storage.getEmployee(req.params.empId);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch employee" });
    }
  });
  
  app.post("/api/employees", async (req, res) => {
    try {
      const data = insertEmployeeSchema.parse(req.body);
      const employee = await storage.createEmployee(data);
      res.json(employee);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create employee" });
    }
  });
  
  app.patch("/api/employees/:empId", async (req, res) => {
    try {
      const employee = await storage.updateEmployee(req.params.empId, req.body);
      if (!employee) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json(employee);
    } catch (error) {
      res.status(500).json({ error: "Failed to update employee" });
    }
  });
  
  app.delete("/api/employees/:empId", async (req, res) => {
    try {
      const deleted = await storage.deleteEmployee(req.params.empId);
      if (!deleted) {
        return res.status(404).json({ error: "Employee not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete employee" });
    }
  });
  
  app.get("/api/attendance", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const attendance = await storage.getAttendance(month);
      res.json(attendance);
    } catch (error) {
      console.error("/api/attendance error:", error);
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });
  
  app.get("/api/attendance/:empId", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const attendance = await storage.getAttendanceByEmployee(req.params.empId, month);
      res.json(attendance);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch attendance" });
    }
  });
  
  app.post("/api/attendance", async (req, res) => {
    try {
      const data = insertAttendanceSchema.parse(req.body);
      const attendance = await storage.createAttendance(data);
      res.json(attendance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create attendance" });
    }
  });
  
  app.post("/api/attendance/bulk", async (req, res) => {
    try {
      const attendances = z.array(insertAttendanceSchema).parse(req.body);

      const employees = await storage.getEmployees();
      const validEmpIds = new Set(employees.map(e => e.emp_id));
      
      const InvalidEmpIds = attendances.filter(a => !validEmpIds.has(a.emp_id));

      if(InvalidEmpIds.length >0){

        const invalidIds = InvalidEmpIds.map(r => r.emp_id).join(", ");
        return res.status(400).json({
          error:"invalid employee IDs in attendance upload",
          invalidIds,
          message: `The following employee IDs are invalid: ${invalidIds}`
        });

      }

      const created = await storage.bulkCreateAttendance(attendances);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      // Log the error server-side for debugging
      // Include error details in the response when in development to help trace the issue
      // but avoid leaking internals in production.
      // eslint-disable-next-line no-console
      console.error("Attendance bulk upload error:", error);
      const status = 500;
      const body: any = { error: "Failed to upload attendance" };
      if (app.get("env") === "development") {
        body.details = (error instanceof Error && error.message) ? error.message : String(error);
      }
      res.status(status).json(body);
    }
  });
  
  app.get("/api/payroll", async (req, res) => {
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
  
  app.get("/api/payroll/:empId", async (req, res) => {
    try {
      const month = req.query.month as string | undefined;
      const payroll = await storage.getPayrollByEmployee(req.params.empId, month);
      const enriched = await enrichPayrollRows(payroll, month);
      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch payroll" });
    }
  });

  app.patch("/api/payroll/:empId", async (req, res) => {
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
app.post("/api/employees/bulk", async (req, res) => {
  try {
    const { employees } = req.body;
    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({ error: "employees array is required" });
    }

    const created: any[] = [];

    for (const [index, raw] of employees.entries()) {
      try {
        const payload = {
          emp_id: String(raw.emp_id),
          name: raw.name,
          civil_id: raw.civil_id || null,
          designation: raw.designation,
          department: raw.department,
          category: raw.category || "Direct",
          doj: raw.doj,
          internal_department_doj: raw.internal_department_doj || null,
  five_year_calc_date: null,
          basic_salary: String(raw.basic_salary ?? 0),
          other_allowance: String(raw.other_allowance ?? 0),
          ot_rate_normal: String(0),
          ot_rate_friday: String(0),
          ot_rate_holiday: String(0),
          food_allowance_type: raw.food_allowance > 0 ? "fixed" : "none",
          food_allowance_amount: String(raw.food_allowance ?? 0),
          working_hours: raw.working_hours ?? 8,
          indemnity_rate: String(raw.indemnity_rate ?? 15),
          status: "active",
        };

        console.log("Row", index, "payload:", payload);
        const data = insertEmployeeSchema.parse(payload);
        const employee = await storage.createEmployee(data);
        created.push(employee);
      } catch (err) {
        console.error("Error on row", index, raw.emp_id, err);
        // return first error to client for debugging
        return res.status(400).json({ row: index, emp_id: raw.emp_id, error: String(err) });
      }
    }

    res.json({ count: created.length, created });
  } catch (err) {
    console.error("Bulk employees upload error (outer):", err);
    res.status(500).json({ error: "Failed to bulk create employees", details: String(err) });
  }
});

app.post("/api/payroll/generate", async (req, res) => {
  try {
    const { month } = req.body;
    
    if (!month) {
      return res.status(400).json({ error: "Month is required" });
    }
    
    // Fetch all required data
    const employees = await storage.getEmployees();
    const attendances = await storage.getAttendance(month);
    const leaves = await storage.getLeaves();
    
    console.log(`Generating payroll for ${month}:`);
    console.log(`- Found ${employees.length} employees`);
    console.log(`- Found ${attendances.length} attendance records`);
    
    const payrolls = [];
    const errors = [];
    
    for (const employee of employees) {
      // Skip inactive employees
      if (employee.status !== "active") {
        console.log(`Skipping ${employee.emp_id} - status: ${employee.status}`);
        continue;
      }
      
      // Get all attendance records for this employee in the selected month
      const empAttendances = attendances.filter(a => a.emp_id === employee.emp_id && a.month === month);
      
      if (empAttendances.length === 0) {
        console.log(`Warning: No attendance record for ${employee.emp_id} (${employee.name}) in ${month}`);
        errors.push({
          emp_id: employee.emp_id,
          name: employee.name,
          error: "No attendance data for selected month"
        });
        continue;
      }
      
      // Aggregate attendance data for the month (sum all records)
      const workingDays = empAttendances.reduce((sum, att) => 
        sum + (parseInt(att.working_days.toString()) || 0), 0);
      const presentDays = empAttendances.reduce((sum, att) => 
        sum + (parseInt(att.present_days.toString()) || 0), 0);
      const absentDays = empAttendances.reduce((sum, att) => 
        sum + (parseInt(att.absent_days.toString()) || 0), 0);
      
      // Use round_off if available, otherwise fallback to present_days
      const roundedOffDays = empAttendances.reduce((sum, att) => {
        const roundOff = att.round_off ? parseFloat(att.round_off.toString()) : 0;
        return sum + roundOff;
      }, 0);
      const actualPresentDays = roundedOffDays > 0 ? roundedOffDays : presentDays;
      const otHoursNormal = empAttendances.reduce((sum, att) => 
        sum + (parseFloat(att.ot_hours_normal || "0")), 0);
      const otHoursFriday = empAttendances.reduce((sum, att) => 
        sum + (parseFloat(att.ot_hours_friday || "0")), 0);
      const otHoursHoliday = empAttendances.reduce((sum, att) => 
        sum + (parseFloat(att.ot_hours_holiday || "0")), 0);
      
      // Aggregate dues_earned from attendance (manual input, not prorated)
      const duesEarned = empAttendances.reduce((sum, att) => 
        sum + (parseFloat(att.dues_earned || "0")), 0);
      
      console.log(`${employee.emp_id}: Aggregated ${empAttendances.length} attendance record(s) for ${month}`);
      
      // Validation: Skip employees with zero working days or zero present days
      if (workingDays === 0) {
        console.log(`Warning: Skipping ${employee.emp_id} (${employee.name}) - Zero working days`);
        errors.push({
          emp_id: employee.emp_id,
          name: employee.name,
          error: "Zero working days in attendance"
        });
        continue;
      }
      
      if (actualPresentDays === 0) {
        console.log(`Warning: Skipping ${employee.emp_id} (${employee.name}) - Zero present/rounded days`);
        errors.push({
          emp_id: employee.emp_id,
          name: employee.name,
          error: "Zero present days (no work performed)"
        });
        continue;
      }
      
      // Parse employee salary data
      const monthlyBasicSalary = parseFloat(employee.basic_salary); // Full monthly contract salary
      const otherAllowance = parseFloat(employee.other_allowance || "0");
      const otRateNormal = parseFloat(employee.ot_rate_normal || "0");
      const otRateFriday = parseFloat(employee.ot_rate_friday || "0");
      const otRateHoliday = parseFloat(employee.ot_rate_holiday || "0");
      const foodAllowanceAmount = parseFloat(employee.food_allowance_amount || "0");

      // Calculate Hourly Basic Salary (HBS) for OT rates using employee's working hours
      const workingHoursPerDay = Number(employee.working_hours ?? 0) > 0 ? Number(employee.working_hours) : 8;
      const totalMonthlyHours = 26 * workingHoursPerDay; // e.g., 26*8=208 or 26*10=260
      const hourlyBasicSalary = monthlyBasicSalary / totalMonthlyHours;

      // Calculate Prorated Basic Salary WITH CAPPING:
      // If worked days >= 26: Pay FULL monthly salary (salaried employees, not daily wage)
      // If worked days < 26: Prorate by worked days (absence penalty)
      const proratedBasicSalary = actualPresentDays >= 26 
        ? monthlyBasicSalary 
        : (monthlyBasicSalary / 26) * actualPresentDays;
      
      // Calculate Prorated Other Allowance WITH CAPPING:
      // If worked days >= 26: Pay FULL allowance
      // If worked days < 26: Prorate by worked days
      const proratedOtherAllowance = otherAllowance > 0 
        ? (actualPresentDays >= 26 ? otherAllowance : (otherAllowance / 26) * actualPresentDays)
        : 0;
      
      // OT hours are already aggregated above (from all attendance records for the month)
      
      // OT MULTIPLIERS (Standard)
      const NORMAL_OT_MULTIPLIER = 1.25;
      const FRIDAY_OT_MULTIPLIER = 1.50;
      const HOLIDAY_OT_MULTIPLIER = 2.00;
      
      let normalOtRate = 0;
      let fridayOtRate = 0;
      let holidayOtRate = 0;
      
      if (otRateNormal > 0) {
        // Employee has custom OT rate per hour
        normalOtRate = otRateNormal;
      } else {
        // Calculate: HBS × Multiplier (HBS from full salary / 208)
        normalOtRate = hourlyBasicSalary * NORMAL_OT_MULTIPLIER;
      }
      
      if (otRateFriday > 0) {
        fridayOtRate = otRateFriday;
      } else {
        fridayOtRate = hourlyBasicSalary * FRIDAY_OT_MULTIPLIER;
      }
      
      if (otRateHoliday > 0) {
        holidayOtRate = otRateHoliday;
      } else {
        holidayOtRate = hourlyBasicSalary * HOLIDAY_OT_MULTIPLIER;
      }
      
      // Calculate OT Pay: Hours × Rate
      let normalOtPay = otHoursNormal * normalOtRate;
      let fridayOtPay = otHoursFriday * fridayOtRate;
      let holidayOtPay = otHoursHoliday * holidayOtRate;
      
      // Special rule: Rehab indirect employees get 70% of OT pay
      const isRehabIndirect = employee.department?.toLowerCase() === 'rehab' && 
                              employee.category?.toLowerCase() === 'indirect';
      if (isRehabIndirect) {
        normalOtPay *= 0.70;
        fridayOtPay *= 0.70;
        holidayOtPay *= 0.70;
        console.log(`  Applied 70% OT reduction for Rehab indirect employee`);
      }
      
      const totalOtPay = normalOtPay + fridayOtPay + holidayOtPay;
      
      // Calculate food allowance: Positive logic - default to 0, only pay if conditions met
      let foodAllowance = 0;
      
      // Robust accommodation check: strip, lowercase, fuzzy match for "own"
      const accommodationRaw = String(employee.accommodation || '').trim().toLowerCase();
      const hasOwnAccommodation = accommodationRaw.includes('own');
      
      // Check category
      const isIndirect = employee.category?.toLowerCase() === 'indirect';
      
      // Only pay if BOTH Indirect category AND Own accommodation
      if (isIndirect && hasOwnAccommodation && foodAllowanceAmount > 0) {
        // WITH CAPPING: If worked days >= 26, pay FULL allowance
        foodAllowance = actualPresentDays >= 26 
          ? foodAllowanceAmount 
          : (foodAllowanceAmount / 26) * actualPresentDays;
        console.log(`  Food Allowance: ${foodAllowance.toFixed(3)} KWD (Indirect + Own: "${employee.accommodation}"${actualPresentDays >= 26 ? ' - FULL' : ''})`);
      } else {
        const reason = !isIndirect ? 'Direct category' : !hasOwnAccommodation ? `Accommodation: "${employee.accommodation}"` : 'No allowance amount';
        console.log(`  Food Allowance: 0 KWD (${reason})`);
      }
      
      // Calculate Gross Salary: Prorated Basic + Prorated Other + Prorated Food + Total OT
      const grossSalary = proratedBasicSalary + proratedOtherAllowance + foodAllowance + totalOtPay;
      
      // Deductions (can be extended in the future)
      const deductions = 0;
      
      // Calculate Net Salary: Gross Salary + Dues Earned - Deductions
      // Formula: Net = (Basic + Food + Allowances + OT) + Dues - Deductions
      const netSalaryRaw = grossSalary + duesEarned - deductions;
      
      // Apply rounding: if decimal >= 0.5 round up, else round down
      const netSalary = Math.round(netSalaryRaw);
      
      // Detailed logging
      console.log(`\n${employee.emp_id} (${employee.name}):`);
      console.log(`  Month: ${month} | Attendance Records: ${empAttendances.length}`);
      console.log(`  Master Basic Salary: ${monthlyBasicSalary.toFixed(3)} KWD`);
      console.log(`  Working Hours: ${workingHoursPerDay}h/day | Total Monthly Hours: ${totalMonthlyHours}`);
      console.log(`  Prorated Basic Salary: ${proratedBasicSalary.toFixed(3)} KWD ${actualPresentDays >= 26 ? '(FULL - CAPPED at 26 days)' : `(${monthlyBasicSalary.toFixed(3)} / 26 × ${actualPresentDays})`}`);
      console.log(`  Prorated Other Allowance: ${proratedOtherAllowance.toFixed(3)} KWD ${actualPresentDays >= 26 && otherAllowance > 0 ? '(FULL - CAPPED)' : ''}`);
      console.log(`  Hourly Basic Salary (HBS): ${hourlyBasicSalary.toFixed(3)} KWD/hour (${monthlyBasicSalary.toFixed(3)} / ${totalMonthlyHours})`);
      console.log(`  Aggregated Attendance - Working: ${workingDays}, Present: ${presentDays}, Round Off: ${roundedOffDays}, Using: ${actualPresentDays}, Absent: ${absentDays} days`);
      console.log(`  OT Calculation Status: ${actualPresentDays >= 26 ? 'FULL MONTH - Salary CAPPED at monthly rate' : 'PARTIAL MONTH - Salary prorated'}`);
      console.log(`  Aggregated OT Hours - Normal: ${otHoursNormal.toFixed(2)}h, Friday: ${otHoursFriday.toFixed(2)}h, Holiday: ${otHoursHoliday.toFixed(2)}h`);
      console.log(`  OT Rates - Normal: ${normalOtRate.toFixed(3)}, Friday: ${fridayOtRate.toFixed(3)}, Holiday: ${holidayOtRate.toFixed(3)} KWD/hour`);
      console.log(`  OT Pay - Normal: ${normalOtPay.toFixed(3)}, Friday: ${fridayOtPay.toFixed(3)}, Holiday: ${holidayOtPay.toFixed(3)} KWD`);
      console.log(`  Total OT Pay: ${totalOtPay.toFixed(3)} KWD`);
      console.log(`  Food Allowance: ${foodAllowance.toFixed(3)} KWD`);
      console.log(`  Dues Earned: ${duesEarned.toFixed(3)} KWD (manual input)`);
      console.log(`  Gross Salary: ${grossSalary.toFixed(3)} KWD`);
      console.log(`  Deductions: ${deductions.toFixed(3)} KWD`);
      console.log(`  Net Salary: ${netSalary.toFixed(3)} KWD (including dues earned)`);
      console.log(`  ⚠️  IMPORTANT: Worked ${actualPresentDays} days ${actualPresentDays >= 26 ? '(≥26) - FULL SALARY PAID' : '(<26) - PRORATED'}`);
      
      payrolls.push({
        emp_id: employee.emp_id,
        month,
        basic_salary: proratedBasicSalary.toFixed(2),
        ot_amount: totalOtPay.toFixed(2),
        food_allowance: foodAllowance.toFixed(2),
        days_worked: actualPresentDays,
        gross_salary: grossSalary.toFixed(2),
        deductions: deductions.toFixed(2),
        dues_earned: duesEarned.toFixed(2),
        net_salary: netSalary.toFixed(2),
      });
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
    
    // Clear existing payroll for this month to avoid duplicates/stale data
    await storage.deletePayroll(month);
    console.log(`Cleared existing payroll records for ${month}`);

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
    res.status(500).json({ error: "Failed to generate payroll", details: error instanceof Error ? error.message : String(error) });
  }
});
  // Mark indemnity as paid (simple status update)
  app.patch("/api/indemnity/:empId/pay", async (req, res) => {
    try {
      const record = await storage.updateIndemnity(req.params.empId, {
        status: "Paid",
        indemnity_amount: req.body?.indemnity_amount, // optional override
      });
      if (!record) return res.status(404).json({ error: "Indemnity record not found" });
      res.json(record);
    } catch (err) {
      res.status(500).json({ error: "Failed to mark indemnity paid" });
    }
  });
  
  app.get("/api/leaves", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const leaves = await storage.getLeaves(status);
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaves" });
    }
  });
  
  app.get("/api/leaves/employee/:empId", async (req, res) => {
    try {
      const leaves = await storage.getLeavesByEmployee(req.params.empId);
      res.json(leaves);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leaves" });
    }
  });
  
  app.get("/api/leaves/:id", async (req, res) => {
    try {
      const leave = await storage.getLeave(parseInt(req.params.id));
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      res.json(leave);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch leave" });
    }
  });
  
  app.post("/api/leaves", async (req, res) => {
    try {
      const data = insertLeaveSchema.parse(req.body);
      const leave = await storage.createLeave(data);
      res.json(leave);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create leave request" });
    }
  });
  
  app.patch("/api/leaves/:id/approve", async (req, res) => {
    try {
      const leave = await storage.updateLeave(parseInt(req.params.id), {
        status: "Approved",
        reviewed_at: new Date(),
        reviewed_by: "admin",
      });
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      res.json(leave);
    } catch (error) {
      res.status(500).json({ error: "Failed to approve leave" });
    }
  });
  
  app.patch("/api/leaves/:id/reject", async (req, res) => {
    try {
      const leave = await storage.updateLeave(parseInt(req.params.id), {
        status: "Rejected",
        reviewed_at: new Date(),
        reviewed_by: "admin",
      });
      if (!leave) {
        return res.status(404).json({ error: "Leave request not found" });
      }
      res.json(leave);
    } catch (error) {
      res.status(500).json({ error: "Failed to reject leave" });
    }
  });
  
  app.get("/api/indemnity", async (req, res) => {
    try {
      const indemnity = await storage.getIndemnity();
      res.json(indemnity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indemnity" });
    }
  });
  
  app.get("/api/reports", async (req, res) => {
    try {
      const month = (req.query.month as string | undefined) || "";
      if (!month) return res.status(400).json({ error: "month query param (MM-YYYY) is required" });

      const [emps, monthAttendance, monthPayroll] = await Promise.all([
        storage.getEmployees(),
        storage.getAttendance(month),
        storage.getPayroll(month),
      ]);

      const attMap = new Map<string, any>();
      for (const a of monthAttendance) attMap.set(a.emp_id, a);

      const payMap = new Map<string, any>();
      for (const p of monthPayroll) payMap.set(p.emp_id, p);

      const rows = emps.map((e) => {
        const a = attMap.get(e.emp_id);
        const p = payMap.get(e.emp_id);

        // Attendance-driven numbers
        const worked_days = p ? Number(p.days_worked ?? 0) : (a?.present_days ?? 0);
        const working_days = a?.working_days ?? 0;
        const normal_ot = Number(a?.ot_hours_normal ?? 0);
        const friday_ot = Number(a?.ot_hours_friday ?? 0);
        const holiday_ot = Number(a?.ot_hours_holiday ?? 0);

        // Base salary from employee record
        const master_basic_salary = Number(e.basic_salary ?? 0);
        const workingHoursPerDay = Number(e.working_hours ?? 0) > 0 ? Number(e.working_hours) : 8;
        const totalMonthlyHours = 26 * workingHoursPerDay; // e.g., 26*8=208 or 26*10=260
        const hourlyBasicSalary = master_basic_salary / totalMonthlyHours;
        
        // Calculate prorated basic salary WITH CAPPING:
        // If worked days >= 26: Pay FULL monthly salary (salaried employees, not daily wage)
        // If worked days < 26: Prorate by worked days (absence penalty)
        const prorated_basic = worked_days >= 26 
          ? master_basic_salary 
          : (master_basic_salary / 26) * worked_days;
        
        // Calculate prorated other allowance WITH CAPPING:
        // If worked days >= 26: Pay FULL allowance
        // If worked days < 26: Prorate by worked days
        const other_allowance = Number(e.other_allowance ?? 0);
        const prorated_other = other_allowance > 0 
          ? (worked_days >= 26 ? other_allowance : (other_allowance / 26) * worked_days)
          : 0;
        
        // Calculate OT rates based on hourly basic salary (from full monthly salary)
        const customRateNormal = Number(e.ot_rate_normal ?? 0);
        const customRateFriday = Number(e.ot_rate_friday ?? 0);
        const customRateHoliday = Number(e.ot_rate_holiday ?? 0);
        
        const rate_normal = customRateNormal > 0 ? customRateNormal : hourlyBasicSalary * 1.25;
        const rate_friday = customRateFriday > 0 ? customRateFriday : hourlyBasicSalary * 1.50;
        const rate_holiday = customRateHoliday > 0 ? customRateHoliday : hourlyBasicSalary * 2.00;

        // Compute OT amounts
        let ot_normal_amount = normal_ot * rate_normal;
        let ot_friday_amount = friday_ot * rate_friday;
        let ot_holiday_amount = holiday_ot * rate_holiday;
        
        // Special rule: Rehab indirect employees get 70% of OT pay
        const isRehabIndirect = e.department?.toLowerCase() === 'rehab' && 
                                e.category?.toLowerCase() === 'indirect';
        if (isRehabIndirect) {
          ot_normal_amount *= 0.70;
          ot_friday_amount *= 0.70;
          ot_holiday_amount *= 0.70;
        }
        
        const ot_amount_calc = ot_normal_amount + ot_friday_amount + ot_holiday_amount;

        // Food allowance: Positive logic - default to 0, only pay if conditions met
        let food_allow_calc = 0;
        
        // Robust accommodation check: strip, lowercase, fuzzy match for "own"
        const accommodationRaw = String(e.accommodation || '').trim().toLowerCase();
        const hasOwnAccommodation = accommodationRaw.includes('own');
        
        // Check category
        const isIndirect = e.category?.toLowerCase() === 'indirect';
        
        // Only pay if BOTH Indirect category AND Own accommodation
        if (isIndirect && hasOwnAccommodation) {
          const food_amount = Number(e.food_allowance_amount ?? 0);
          if (food_amount > 0) {
            // WITH CAPPING: If worked days >= 26, pay FULL allowance
            food_allow_calc = worked_days >= 26 
              ? food_amount 
              : (food_amount / 26) * worked_days;
          }
        }

        // Dues earned from attendance (manual input, fixed amount)
        const dues_earned_calc = Number(a?.dues_earned ?? 0);
        
        // Prefer persisted payroll amounts if available, otherwise use calculated
        const food_allow = p ? Number(p.food_allowance ?? 0) : food_allow_calc;
        const ot_amount = p ? Number(p.ot_amount ?? 0) : ot_amount_calc;
        const dues_earned = p ? Number(p.dues_earned ?? 0) : dues_earned_calc;
        const deductions = p ? Number(p.deductions ?? 0) : 0;
        const gross_salary = p ? Number(p.gross_salary ?? 0) : (prorated_basic + prorated_other + food_allow + ot_amount);
        
        // Net Salary: Gross + Dues Earned - Deductions
        const net_salary_raw = p ? Number(p.net_salary ?? 0) : (gross_salary + dues_earned - deductions);
        
        // Apply rounding: if decimal >= 0.5 round up, else round down
        const net_salary = Math.round(net_salary_raw);
        
        // Allowances earned: Only the prorated other allowance (food is separate column)
        const allowances_earned = prorated_other;

        return {
          emp_id: e.emp_id,
          name: e.name,
          designation: e.designation,
          department: e.department,
          salary: master_basic_salary,
          worked_days,
          working_days,
          normal_ot,
          friday_ot,
          holiday_ot,
          food_allow,
          allowances_earned,
          dues_earned,
          deductions,
          gross_salary,
          total_earnings: net_salary,
          comments: a?.comments ?? "",
          month,
        };
      }).filter((row) => {
        // Exclude employees with 0 worked days unless they have comments
        const hasComments = row.comments && row.comments.trim().length > 0;
        return row.worked_days > 0 || hasComments;
      });

      res.json(rows);
    } catch (error) {
      console.error("/api/reports error:", error);
      res.status(500).json({ error: "Failed to build report" });
    }
  });

  app.get("/api/indemnity/:empId", async (req, res) => {
    try {
      const indemnity = await storage.getIndemnityByEmployee(req.params.empId);
      if (!indemnity) {
        return res.status(404).json({ error: "Indemnity record not found" });
      }
      res.json(indemnity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch indemnity" });
    }
  });
  
  app.post("/api/indemnity/calculate", async (req, res) => {
    try {
      const employees = await storage.getEmployees();
      const indemnityRecords = [];
      
      for (const employee of employees) {
        const doj = new Date(employee.doj);
        const now = new Date();
        const yearsOfService = (now.getTime() - doj.getTime()) / (1000 * 60 * 60 * 24 * 365);
        
        const basicSalary = parseFloat(employee.basic_salary);
        let indemnityAmount = 0;
        
        if (yearsOfService <= 5) {
          indemnityAmount = (basicSalary * 15 / 30) * yearsOfService;
        } else {
          const firstFiveYears = (basicSalary * 15 / 30) * 5;
          const remainingYears = yearsOfService - 5;
          const afterFiveYears = (basicSalary * 30 / 30) * remainingYears;
          indemnityAmount = firstFiveYears + afterFiveYears;
        }
        
        const existing = await storage.getIndemnityByEmployee(employee.emp_id);
        
        if (existing) {
          await storage.updateIndemnity(employee.emp_id, {
            years_of_service: yearsOfService.toFixed(2),
            indemnity_amount: indemnityAmount.toFixed(2),
          });
        } else {
          indemnityRecords.push({
            emp_id: employee.emp_id,
            years_of_service: yearsOfService.toFixed(2),
            indemnity_amount: indemnityAmount.toFixed(2),
            status: "Active",
          });
        }
      }
      
      const created = await Promise.all(
        indemnityRecords.map(record => storage.createIndemnity(record))
      );
      
      res.json({ message: "Indemnity calculated successfully", created });
    } catch (error) {
      console.error("Indemnity calculation error:", error);
      res.status(500).json({ error: "Failed to calculate indemnity" });
    }
  });
  
  app.patch("/api/indemnity/:empId/pay", async (req, res) => {
    try {
      const indemnity = await storage.updateIndemnity(req.params.empId, {
        status: "Paid",
      });
      if (!indemnity) {
        return res.status(404).json({ error: "Indemnity record not found" });
      }
      res.json(indemnity);
    } catch (error) {
      res.status(500).json({ error: "Failed to process payment" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
