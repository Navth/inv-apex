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
 * Calculate prorated salary based on worked days WITH CAPPING
 * - If worked days >= 26: Pay FULL monthly amount (salaried employees)
 * - If worked days < 26: Prorate by worked days (absence penalty)
 */
function calculateProratedAmount(monthlyAmount: number, workedDays: number): number {
  if (monthlyAmount <= 0) return 0;
  
  if (workedDays >= KUWAIT_WORKING_DAYS_PER_MONTH) {
    return monthlyAmount; // FULL amount - CAPPED
  }
  
  return (monthlyAmount / KUWAIT_WORKING_DAYS_PER_MONTH) * workedDays;
}

/**
 * Check if employee is a Rehab department indirect employee
 */
function isRehabIndirect(employee: Employee): boolean {
  return employee.department?.toLowerCase() === 'rehab' && 
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
 * Key rules (per client requirements):
 * - WORKED DAYS (for salary): Use round_off from Excel when available - it is the authoritative adjusted figure.
 *   When multiple records exist (e.g. different projects), use MAX(round_off) to avoid wrong sums (e.g. 26+26+26=78).
 * - WORKING DAYS: Total expected days in month - use MAX when multiple records (don't sum).
 */
export function aggregateAttendance(attendances: Attendance[]): AggregatedAttendance {
  const workingDaysArr = attendances.map(att => parseInt(att.working_days.toString()) || 0);
  const workingDays = workingDaysArr.length > 0 ? Math.max(...workingDaysArr) : 0;
  
  const presentDays = attendances.reduce((sum, att) => 
    sum + (parseInt(att.present_days.toString()) || 0), 0);
  
  const absentDays = attendances.reduce((sum, att) => 
    sum + (parseInt(att.absent_days.toString()) || 0), 0);
  
  // Use round_off when available - it is the authoritative figure for salary calculation.
  // When multiple records: use MAX(round_off), NOT sum (avoids 26+26+26=78 for multi-project employees)
  const roundOffValues = attendances
    .map(att => att.round_off ? parseFloat(att.round_off.toString()) : 0)
    .filter(v => v > 0);
  const roundedOffDays = roundOffValues.length > 0 ? Math.max(...roundOffValues) : 0;
  
  let actualPresentDays = roundedOffDays > 0 ? roundedOffDays : presentDays;
  // Cap at 26: salary calculation is always based on 26 working days/month (Kuwait). Prevents 78 glitch if round_off was missing.
  actualPresentDays = Math.min(actualPresentDays, KUWAIT_WORKING_DAYS_PER_MONTH);
  
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
 * Calculate food allowance for an employee
 * Source 1: Master sheet (food_allowance_amount) - prorated when Indirect + Own accommodation
 * Source 2: Food money worksheet - use amount as-is (already calculated per month)
 */
export function calculateFoodAllowance(
  employee: Employee,
  actualPresentDays: number,
  worksheetAmount?: number
): number {
  // If worksheet provides amount (employees who get food money separately), use it
  if (worksheetAmount !== undefined && worksheetAmount > 0) {
    return worksheetAmount;
  }
  // Otherwise use master sheet amount (Indirect + Own accommodation only)
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
 * Calculate payroll for a single employee
 * @param foodMoneyAmount - Optional amount from food money worksheet for this employee
 */
export function calculateEmployeePayroll(
  employee: Employee,
  attendance: AggregatedAttendance,
  month: string,
  foodMoneyAmount?: number
): PayrollCalculationResult {
  const monthlyBasicSalary = parseFloat(employee.basic_salary);
  const otherAllowance = parseFloat(employee.other_allowance || "0");
  const { actualPresentDays, otHoursNormal, otHoursFriday, otHoursHoliday, duesEarned } = attendance;
  
  // Calculate prorated salaries
  const proratedBasicSalary = calculateProratedAmount(monthlyBasicSalary, actualPresentDays);
  const proratedOtherAllowance = calculateProratedAmount(otherAllowance, actualPresentDays);
  
  // Calculate OT
  const ot = calculateOT(employee, otHoursNormal, otHoursFriday, otHoursHoliday);
  
  // Calculate food allowance (from master or from worksheet)
  const foodAllowance = calculateFoodAllowance(employee, actualPresentDays, foodMoneyAmount);
  
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
    days_worked: actualPresentDays,
    gross_salary: grossSalary.toFixed(2),
    deductions: deductions.toFixed(2),
    dues_earned: duesEarned.toFixed(2),
    net_salary: netSalary.toFixed(2),
  };
}

/**
 * Generate payroll for employees who have attendance for the month.
 * Includes ex-employees (inactive) when they have attendance for past months.
 * @param foodMoneyMap - Optional map of emp_id -> amount from food money worksheet
 */
export function generatePayroll(
  employees: Employee[],
  attendances: Attendance[],
  month: string,
  foodMoneyMap?: Map<string, number>
): PayrollGenerationResult {
  const payrolls: PayrollCalculationResult[] = [];
  const errors: PayrollError[] = [];
  
  const employeeMap = new Map(employees.map((e) => [e.emp_id, e]));
  
  // Create attendance lookup - iterate over emp_ids with attendance (includes ex-employees)
  const attendanceMap = new Map<string, Attendance[]>();
  for (const att of attendances) {
    if (att.month !== month) continue;
    const existing = attendanceMap.get(att.emp_id) || [];
    existing.push(att);
    attendanceMap.set(att.emp_id, existing);
  }
  
  for (const [empId, empAttendances] of attendanceMap) {
    const employee = employeeMap.get(empId);
    if (!employee) {
      errors.push({
        emp_id: empId,
        name: "Unknown",
        error: "Employee not found in master (add to master sheet for payroll)",
      });
      continue;
    }
    
    const aggregated = aggregateAttendance(empAttendances);
    
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
    
    const foodMoneyAmount = foodMoneyMap?.get(empId);
    const payroll = calculateEmployeePayroll(employee, aggregated, month, foodMoneyAmount);
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
