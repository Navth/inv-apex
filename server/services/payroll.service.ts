/**
 * Payroll Calculation Service
 * 
 * This service handles all payroll calculations based on Kuwait labor law.
 * It provides a clean interface for generating payroll from employee and attendance data.
 */

import type { Employee, Attendance, InsertPayroll } from "@shared/schema";
import {
  KUWAIT_WORKING_DAYS_PER_MONTH,
  DEFAULT_WORKING_HOURS_PER_DAY,
  OT_MULTIPLIERS,
  REHAB_INDIRECT_OT_PERCENTAGE,
  FOOD_ALLOWANCE_ELIGIBLE_ACCOMMODATIONS,
  FOOD_ALLOWANCE_ELIGIBLE_CATEGORIES,
} from "../config/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface PayrollCalculationResult {
  emp_id: string;
  month: string;
  basic_salary: string;
  ot_amount: string;
  food_allowance: string;
  days_worked: number;
  gross_salary: string;
  deductions: string;
  dues_earned: string;
  net_salary: string;
}

export interface PayrollGenerationResult {
  payrolls: PayrollCalculationResult[];
  errors: PayrollError[];
}

export interface PayrollError {
  emp_id: string;
  name: string;
  error: string;
}

export interface AggregatedAttendance {
  workingDays: number;
  presentDays: number;
  absentDays: number;
  roundedOffDays: number;
  actualPresentDays: number;
  otHoursNormal: number;
  otHoursFriday: number;
  otHoursHoliday: number;
  duesEarned: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get working hours per day for an employee, with fallback to default
 */
function getWorkingHoursPerDay(employee: Employee): number {
  const hours = Number(employee.working_hours ?? 0);
  return hours > 0 ? hours : DEFAULT_WORKING_HOURS_PER_DAY;
}

/**
 * Calculate hourly basic salary (HBS)
 * Formula: HBS = Monthly Basic Salary / (26 × Working Hours Per Day)
 */
function calculateHourlyBasicSalary(monthlyBasicSalary: number, workingHoursPerDay: number): number {
  const totalMonthlyHours = KUWAIT_WORKING_DAYS_PER_MONTH * workingHoursPerDay;
  return monthlyBasicSalary / totalMonthlyHours;
}

/**
 * Cap worked days at 26 (Kuwait standard). Used for proration so we never pay more than full month.
 */
function capWorkingDaysAtMax(workedDays: number): number {
  return Math.min(workedDays, KUWAIT_WORKING_DAYS_PER_MONTH);
}

/**
 * Calculate prorated salary based on worked days WITH CAPPING
 * - Working days are capped at 26 max (salaried employees never get more than full month)
 * - If worked days >= 26: Pay FULL monthly amount
 * - If worked days < 26: Prorate by (capped) worked days (absence penalty)
 */
function calculateProratedAmount(monthlyAmount: number, workedDays: number): number {
  if (monthlyAmount <= 0) return 0;
  const capped = capWorkingDaysAtMax(workedDays);
  if (capped >= KUWAIT_WORKING_DAYS_PER_MONTH) {
    return monthlyAmount; // FULL amount - CAPPED
  }
  return (monthlyAmount / KUWAIT_WORKING_DAYS_PER_MONTH) * capped;
}

/** Employee with optional department name (from join) */
type EmployeeWithDeptName = Employee & { department_name?: string };

/**
 * Check if employee is a Rehab department indirect employee
 */
function isRehabIndirect(employee: EmployeeWithDeptName): boolean {
  const deptName = employee.department_name ?? (employee as any).department;
  return String(deptName || '').toLowerCase() === 'rehab' && 
         employee.category?.toLowerCase() === 'indirect';
}

/**
 * Check if employee qualifies for food allowance
 * - Must be Indirect category
 * - Must have Own accommodation
 */
function qualifiesForFoodAllowance(employee: Employee): boolean {
  const accommodationRaw = String(employee.accommodation || '').trim().toLowerCase();
  const hasOwnAccommodation = FOOD_ALLOWANCE_ELIGIBLE_ACCOMMODATIONS.some(
    type => accommodationRaw.includes(type)
  );
  
  const isIndirect = FOOD_ALLOWANCE_ELIGIBLE_CATEGORIES.some(
    cat => employee.category?.toLowerCase() === cat
  );
  
  return isIndirect && hasOwnAccommodation;
}

// =============================================================================
// AGGREGATION FUNCTIONS
// =============================================================================

/**
 * Aggregate attendance records for a month into a single summary.
 *
 * SALARY CALCULATION USES ROUNDED DAYS:
 * - actualPresentDays is what drives all proration (basic salary, other allowance, food allowance).
 * - When round_off is present in attendance, we use roundedOffDays (sum of round_off).
 * - When round_off is null/zero, we fall back to present_days.
 * - Working days are capped at 26 (KUWAIT_WORKING_DAYS_PER_MONTH) for proration.
 */
export function aggregateAttendance(attendances: Attendance[]): AggregatedAttendance {
  const workingDays = attendances.reduce((sum, att) =>
    sum + (parseInt(att.working_days.toString()) || 0), 0);

  const presentDays = attendances.reduce((sum, att) =>
    sum + (parseInt(att.present_days.toString()) || 0), 0);

  const absentDays = attendances.reduce((sum, att) =>
    sum + (parseInt(att.absent_days.toString()) || 0), 0);

  // round_off from sheet = rounded working days; used for salary proration
  const roundedOffDays = attendances.reduce((sum, att) => {
    const roundOff = att.round_off ? parseFloat(att.round_off.toString()) : 0;
    return sum + roundOff;
  }, 0);

  const actualPresentDays = roundedOffDays > 0 ? roundedOffDays : presentDays;
  
  const otHoursNormal = attendances.reduce((sum, att) => 
    sum + (parseFloat(att.ot_hours_normal || "0")), 0);
  
  const otHoursFriday = attendances.reduce((sum, att) => 
    sum + (parseFloat(att.ot_hours_friday || "0")), 0);
  
  const otHoursHoliday = attendances.reduce((sum, att) => 
    sum + (parseFloat(att.ot_hours_holiday || "0")), 0);
  
  const duesEarned = attendances.reduce((sum, att) => 
    sum + (parseFloat(att.dues_earned || "0")), 0);
  
  return {
    workingDays,
    presentDays,
    absentDays,
    roundedOffDays,
    actualPresentDays,
    otHoursNormal,
    otHoursFriday,
    otHoursHoliday,
    duesEarned,
  };
}

// =============================================================================
// OT CALCULATION
// =============================================================================

export interface OTCalculation {
  rates: {
    normal: number;
    friday: number;
    holiday: number;
  };
  pay: {
    normal: number;
    friday: number;
    holiday: number;
    total: number;
  };
}

/**
 * Calculate OT rates and amounts for an employee
 */
export function calculateOT(
  employee: Employee,
  otHoursNormal: number,
  otHoursFriday: number,
  otHoursHoliday: number
): OTCalculation {
  const monthlyBasicSalary = parseFloat(employee.basic_salary);
  const workingHoursPerDay = getWorkingHoursPerDay(employee);
  const hourlyBasicSalary = calculateHourlyBasicSalary(monthlyBasicSalary, workingHoursPerDay);
  
  // Get custom OT rates if available
  const customOtRateNormal = parseFloat(employee.ot_rate_normal || "0");
  const customOtRateFriday = parseFloat(employee.ot_rate_friday || "0");
  const customOtRateHoliday = parseFloat(employee.ot_rate_holiday || "0");
  
  // Calculate OT Rates: HBS × Multiplier (or use custom rate)
  const normalOtRate = customOtRateNormal > 0 
    ? customOtRateNormal 
    : hourlyBasicSalary * OT_MULTIPLIERS.NORMAL;
    
  const fridayOtRate = customOtRateFriday > 0 
    ? customOtRateFriday 
    : hourlyBasicSalary * OT_MULTIPLIERS.FRIDAY;
    
  const holidayOtRate = customOtRateHoliday > 0 
    ? customOtRateHoliday 
    : hourlyBasicSalary * OT_MULTIPLIERS.HOLIDAY;
  
  // Calculate OT Pay
  let normalPay = otHoursNormal * normalOtRate;
  let fridayPay = otHoursFriday * fridayOtRate;
  let holidayPay = otHoursHoliday * holidayOtRate;
  
  // Special rule: Rehab department indirect employees get 70% of OT pay
  if (isRehabIndirect(employee)) {
    normalPay *= REHAB_INDIRECT_OT_PERCENTAGE;
    fridayPay *= REHAB_INDIRECT_OT_PERCENTAGE;
    holidayPay *= REHAB_INDIRECT_OT_PERCENTAGE;
  }
  
  return {
    rates: {
      normal: normalOtRate,
      friday: fridayOtRate,
      holiday: holidayOtRate,
    },
    pay: {
      normal: normalPay,
      friday: fridayPay,
      holiday: holidayPay,
      total: normalPay + fridayPay + holidayPay,
    },
  };
}

// =============================================================================
// FOOD ALLOWANCE CALCULATION
// =============================================================================

/**
 * Calculate food allowance for an employee (prorated with capping)
 */
export function calculateFoodAllowance(employee: Employee, actualPresentDays: number): number {
  if (!qualifiesForFoodAllowance(employee)) {
    return 0;
  }
  
  const foodAllowanceAmount = parseFloat(employee.food_allowance_amount || "0");
  if (foodAllowanceAmount <= 0) {
    return 0;
  }
  
  return calculateProratedAmount(foodAllowanceAmount, actualPresentDays);
}

// =============================================================================
// MAIN PAYROLL CALCULATION
// =============================================================================

/**
 * Calculate payroll for a single employee.
 *
 * Uses actualPresentDays (round_off when present, else present_days) for all proration.
 * Basic salary, other allowance, food allowance all use this value.
 * Capped at 26 max days (Kuwait standard).
 */
export function calculateEmployeePayroll(
  employee: Employee,
  attendance: AggregatedAttendance,
  month: string
): PayrollCalculationResult {
  const monthlyBasicSalary = parseFloat(employee.basic_salary);
  const otherAllowance = parseFloat(employee.other_allowance || "0");
  const { actualPresentDays, otHoursNormal, otHoursFriday, otHoursHoliday, duesEarned } = attendance;

  // actualPresentDays = roundedOffDays when round_off exists, else present_days
  const daysForProration = capWorkingDaysAtMax(actualPresentDays);

  const proratedBasicSalary = calculateProratedAmount(monthlyBasicSalary, actualPresentDays);
  const proratedOtherAllowance = calculateProratedAmount(otherAllowance, actualPresentDays);
  
  // Calculate OT
  const ot = calculateOT(employee, otHoursNormal, otHoursFriday, otHoursHoliday);
  
  // Calculate food allowance (same rounded/capped days)
  const foodAllowance = calculateFoodAllowance(employee, actualPresentDays);
  
  // Calculate totals
  const grossSalary = proratedBasicSalary + proratedOtherAllowance + foodAllowance + ot.pay.total;
  const deductions = 0;
  
  // Net Salary: Gross + Dues Earned - Deductions
  const netSalaryRaw = grossSalary + duesEarned - deductions;
  const netSalary = Math.round(netSalaryRaw);
  
  return {
    emp_id: employee.emp_id,
    month,
    basic_salary: proratedBasicSalary.toFixed(2),
    ot_amount: ot.pay.total.toFixed(2),
    food_allowance: foodAllowance.toFixed(2),
    days_worked: Math.round(daysForProration),
    gross_salary: grossSalary.toFixed(2),
    deductions: deductions.toFixed(2),
    dues_earned: duesEarned.toFixed(2),
    net_salary: netSalary.toFixed(2),
  };
}

/**
 * Generate payroll for all active employees
 */
export function generatePayroll(
  employees: Employee[],
  attendances: Attendance[],
  month: string
): PayrollGenerationResult {
  const payrolls: PayrollCalculationResult[] = [];
  const errors: PayrollError[] = [];
  
  // Create attendance lookup map
  const attendanceMap = new Map<string, Attendance[]>();
  for (const att of attendances) {
    if (att.month !== month) continue;
    
    const existing = attendanceMap.get(att.emp_id) || [];
    existing.push(att);
    attendanceMap.set(att.emp_id, existing);
  }
  
  for (const employee of employees) {
    // Skip inactive employees
    if (employee.status !== "active") {
      continue;
    }
    
    // Get attendance records for this employee
    const empAttendances = attendanceMap.get(employee.emp_id);
    
    if (!empAttendances || empAttendances.length === 0) {
      errors.push({
        emp_id: employee.emp_id,
        name: employee.name,
        error: "No attendance data for selected month",
      });
      continue;
    }
    
    // Aggregate attendance
    const aggregated = aggregateAttendance(empAttendances);
    
    // Validate attendance data
    if (aggregated.workingDays === 0) {
      errors.push({
        emp_id: employee.emp_id,
        name: employee.name,
        error: "Zero working days in attendance",
      });
      continue;
    }
    
    if (aggregated.actualPresentDays === 0) {
      errors.push({
        emp_id: employee.emp_id,
        name: employee.name,
        error: "Zero present days (no work performed)",
      });
      continue;
    }
    
    // Calculate payroll
    const payroll = calculateEmployeePayroll(employee, aggregated, month);
    payrolls.push(payroll);
  }
  
  return { payrolls, errors };
}

// =============================================================================
// LOGGING UTILITIES (for debugging)
// =============================================================================

export interface PayrollDebugInfo {
  emp_id: string;
  name: string;
  month: string;
  masterBasicSalary: number;
  workingHoursPerDay: number;
  totalMonthlyHours: number;
  hourlyBasicSalary: number;
  attendance: AggregatedAttendance;
  proratedBasicSalary: number;
  proratedOtherAllowance: number;
  otCalculation: OTCalculation;
  foodAllowance: number;
  grossSalary: number;
  duesEarned: number;
  deductions: number;
  netSalary: number;
  isCapped: boolean;
  isRehabIndirect: boolean;
}

/**
 * Generate debug info for a payroll calculation (useful for logging)
 */
export function getPayrollDebugInfo(
  employee: Employee,
  attendance: AggregatedAttendance,
  month: string
): PayrollDebugInfo {
  const monthlyBasicSalary = parseFloat(employee.basic_salary);
  const otherAllowance = parseFloat(employee.other_allowance || "0");
  const workingHoursPerDay = getWorkingHoursPerDay(employee);
  const totalMonthlyHours = KUWAIT_WORKING_DAYS_PER_MONTH * workingHoursPerDay;
  const hourlyBasicSalary = calculateHourlyBasicSalary(monthlyBasicSalary, workingHoursPerDay);
  
  const { actualPresentDays, otHoursNormal, otHoursFriday, otHoursHoliday, duesEarned } = attendance;
  
  const proratedBasicSalary = calculateProratedAmount(monthlyBasicSalary, actualPresentDays);
  const proratedOtherAllowance = calculateProratedAmount(otherAllowance, actualPresentDays);
  const otCalculation = calculateOT(employee, otHoursNormal, otHoursFriday, otHoursHoliday);
  const foodAllowance = calculateFoodAllowance(employee, actualPresentDays);
  
  const grossSalary = proratedBasicSalary + proratedOtherAllowance + foodAllowance + otCalculation.pay.total;
  const deductions = 0;
  const netSalary = Math.round(grossSalary + duesEarned - deductions);
  
  return {
    emp_id: employee.emp_id,
    name: employee.name,
    month,
    masterBasicSalary: monthlyBasicSalary,
    workingHoursPerDay,
    totalMonthlyHours,
    hourlyBasicSalary,
    attendance,
    proratedBasicSalary,
    proratedOtherAllowance,
    otCalculation,
    foodAllowance,
    grossSalary,
    duesEarned,
    deductions,
    netSalary,
    isCapped: actualPresentDays >= KUWAIT_WORKING_DAYS_PER_MONTH,
    isRehabIndirect: isRehabIndirect(employee),
  };
}

/**
 * Log payroll debug info to console (only in development)
 */
export function logPayrollDebugInfo(info: PayrollDebugInfo): void {
  if (process.env.NODE_ENV === 'production') return;
  
  console.log(`\n${info.emp_id} (${info.name}):`);
  console.log(`  Month: ${info.month}`);
  console.log(`  Master Basic Salary: ${info.masterBasicSalary.toFixed(3)} KWD`);
  console.log(`  Working Hours: ${info.workingHoursPerDay}h/day | Total Monthly Hours: ${info.totalMonthlyHours}`);
  console.log(`  Hourly Basic Salary (HBS): ${info.hourlyBasicSalary.toFixed(3)} KWD/hour`);
  console.log(`  Attendance - Working: ${info.attendance.workingDays}, Present: ${info.attendance.presentDays}, Round Off: ${info.attendance.roundedOffDays}, Using: ${info.attendance.actualPresentDays}`);
  console.log(`  Prorated Basic Salary: ${info.proratedBasicSalary.toFixed(3)} KWD ${info.isCapped ? '(FULL - CAPPED)' : ''}`);
  console.log(`  Prorated Other Allowance: ${info.proratedOtherAllowance.toFixed(3)} KWD`);
  console.log(`  OT Hours - Normal: ${info.attendance.otHoursNormal.toFixed(2)}h, Friday: ${info.attendance.otHoursFriday.toFixed(2)}h, Holiday: ${info.attendance.otHoursHoliday.toFixed(2)}h`);
  console.log(`  OT Rates - Normal: ${info.otCalculation.rates.normal.toFixed(3)}, Friday: ${info.otCalculation.rates.friday.toFixed(3)}, Holiday: ${info.otCalculation.rates.holiday.toFixed(3)} KWD/hour`);
  console.log(`  Total OT Pay: ${info.otCalculation.pay.total.toFixed(3)} KWD ${info.isRehabIndirect ? '(70% Rehab Indirect)' : ''}`);
  console.log(`  Food Allowance: ${info.foodAllowance.toFixed(3)} KWD`);
  console.log(`  Dues Earned: ${info.duesEarned.toFixed(3)} KWD`);
  console.log(`  Gross Salary: ${info.grossSalary.toFixed(3)} KWD`);
  console.log(`  Net Salary: ${info.netSalary.toFixed(3)} KWD`);
}
