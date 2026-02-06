/**
 * Payroll Calculation Utility for Kuwait Labor Law
 * 
 * This module provides helper functions to calculate employee payroll
 * based on Kuwait labor law standards and company policies.
 */

import type { Employee, Attendance, Leave } from "@shared/schema";

/**
 * Standard payroll calculation constants based on Kuwait labor law
 */
export const KUWAIT_WORKING_DAYS_PER_MONTH = 26;
export const DEFAULT_WORKING_HOURS_PER_DAY = 8;
export const HOURS_DIVISOR = 208; // 26 days × 8 hours

/**
 * Standard OT multipliers for Kuwait
 */
export const OT_MULTIPLIERS = {
  normal: 1.25,    // Normal weekday OT
  friday: 1.50,    // Friday OT
  holiday: 2.00,   // Public holiday OT
};

function resolveHoursPerDay(hours?: number | null): number {
  const parsed = Number(hours ?? 0);
  return parsed > 0 ? parsed : DEFAULT_WORKING_HOURS_PER_DAY;
}

/**
 * Calculate Hourly Basic Salary (HBS) for OT rate calculations
 * Formula: HBS = Basic Salary ÷ (26 × Working Hours Per Day)
 * Note: Uses full monthly basic salary, not prorated
 * Working hours can be 8, 10, or other values per employee
 */
export function calculateHourlyBasicSalary(
  basicSalary: number,
  workingHoursPerDay: number
): number {
  const hoursPerDay = workingHoursPerDay > 0 ? workingHoursPerDay : DEFAULT_WORKING_HOURS_PER_DAY;
  const totalMonthlyHours = KUWAIT_WORKING_DAYS_PER_MONTH * hoursPerDay;
  return basicSalary / totalMonthlyHours;
}

/**
 * Calculate prorated basic salary based on worked days WITH CAPPING
 * Formula: 
 *   - If worked days >= 26: Pay FULL monthly salary (salaried employees)
 *   - If worked days < 26: Prorate by worked days (absence penalty)
 * This prevents overpayment when employees work 27+ days in a month (e.g., December)
 */
export function calculateProratedBasicSalary(
  basicSalary: number,
  workedDays: number
): number {
  // Employees are monthly salaried, not daily wage workers
  // Working more than 26 days should NOT increase base salary
  if (workedDays >= KUWAIT_WORKING_DAYS_PER_MONTH) {
    return basicSalary; // FULL salary - CAPPED
  }
  return (basicSalary / KUWAIT_WORKING_DAYS_PER_MONTH) * workedDays;
}

/**
 * Calculate prorated other allowance based on worked days WITH CAPPING
 * Formula: 
 *   - If worked days >= 26: Pay FULL allowance
 *   - If worked days < 26: Prorate by worked days
 */
export function calculateProratedOtherAllowance(
  otherAllowance: number,
  workedDays: number
): number {
  if (otherAllowance <= 0) return 0;
  
  // Cap at full monthly allowance if worked full month or more
  if (workedDays >= KUWAIT_WORKING_DAYS_PER_MONTH) {
    return otherAllowance; // FULL allowance - CAPPED
  }
  return (otherAllowance / KUWAIT_WORKING_DAYS_PER_MONTH) * workedDays;
}

/**
 * Calculate daily rate from monthly salary (for reference/reporting)
 */
export function calculateDailyRate(monthlySalary: number): number {
  return monthlySalary / KUWAIT_WORKING_DAYS_PER_MONTH;
}

/**
 * Calculate OT rates and amounts for an employee
 * Returns rates (KWD/hour) and pay (KWD) for each OT type
 * Special rule: Rehab department indirect employees receive 70% of OT pay
 */
export function calculateOvertimeAmount(
  employee: Employee,
  attendance: Attendance
): {
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
} {
  const basicSalary = parseFloat(employee.basic_salary);
  const workingHoursPerDay = resolveHoursPerDay(employee.working_hours);
  const hourlyBasicSalary = calculateHourlyBasicSalary(basicSalary, workingHoursPerDay);
  
  // Get employee's custom OT rates if available (these are per-hour rates)
  const customOtRateNormal = parseFloat(employee.ot_rate_normal || "0");
  const customOtRateFriday = parseFloat(employee.ot_rate_friday || "0");
  const customOtRateHoliday = parseFloat(employee.ot_rate_holiday || "0");
  
  // Get OT hours from attendance
  const otHoursNormal = parseFloat(attendance.ot_hours_normal || "0");
  const otHoursFriday = parseFloat(attendance.ot_hours_friday || "0");
  const otHoursHoliday = parseFloat(attendance.ot_hours_holiday || "0");
  
  // Calculate OT Rates: HBS × Multiplier (or use custom rate)
  const normalOtRate = customOtRateNormal > 0 
    ? customOtRateNormal 
    : hourlyBasicSalary * OT_MULTIPLIERS.normal;
    
  const fridayOtRate = customOtRateFriday > 0 
    ? customOtRateFriday 
    : hourlyBasicSalary * OT_MULTIPLIERS.friday;
    
  const holidayOtRate = customOtRateHoliday > 0 
    ? customOtRateHoliday 
    : hourlyBasicSalary * OT_MULTIPLIERS.holiday;
  
  // Calculate OT Pay: Hours × Rate
  let normalPay = otHoursNormal * normalOtRate;
  let fridayPay = otHoursFriday * fridayOtRate;
  let holidayPay = otHoursHoliday * holidayOtRate;
  
  // Special rule: Rehab department indirect employees get 70% of OT pay
  const deptName = (employee as { department_name?: string; department?: string }).department_name ?? (employee as any).department;
  const isRehabIndirect = String(deptName || '').toLowerCase() === 'rehab' && 
                          employee.category?.toLowerCase() === 'indirect';
  
  if (isRehabIndirect) {
    normalPay = normalPay * 0.70;
    fridayPay = fridayPay * 0.70;
    holidayPay = holidayPay * 0.70;
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

/**
 * Calculate food allowance for an employee WITH CAPPING
 * Rules (Positive Logic - Default to 0):
 * 1. Default food allowance is 0 (SAFE)
 * 2. Only pay if accommodation contains "own" (case-insensitive, fuzzy match)
 * 3. Must be Indirect category
 * 4. If worked days >= 26: Pay FULL allowance
 * 5. If worked days < 26: Prorate by worked days
 */
export function calculateFoodAllowance(
  employee: Employee,
  workedDays: number
): number {
  // Default to 0 (safe default - only pay if conditions are met)
  let foodAllowance = 0;
  
  // Robust accommodation check: strip whitespace, lowercase, check for "own"
  const accommodationRaw = String(employee.accommodation || '').trim().toLowerCase();
  const hasOwnAccommodation = accommodationRaw.includes('own');
  
  // Check category (must be Indirect)
  const isIndirect = employee.category?.toLowerCase() === 'indirect';
  
  // Positive logic: Only pay if BOTH conditions are met
  if (isIndirect && hasOwnAccommodation) {
    const foodAllowanceAmount = parseFloat(employee.food_allowance_amount || "0");
    if (foodAllowanceAmount > 0) {
      // WITH CAPPING: If worked days >= 26, pay FULL allowance
      if (workedDays >= KUWAIT_WORKING_DAYS_PER_MONTH) {
        foodAllowance = foodAllowanceAmount; // FULL allowance - CAPPED
      } else {
        // Prorate food allowance: (Food Allowance / 26) × Worked Days
        foodAllowance = (foodAllowanceAmount / KUWAIT_WORKING_DAYS_PER_MONTH) * workedDays;
      }
    }
  }
  
  return foodAllowance;
}

/**
 * Get basic salary (full monthly salary, not prorated)
 * Based on the specification: Basic Salary is treated as the base and not prorated
 */
export function getBasicSalary(employee: Employee): number {
  return parseFloat(employee.basic_salary);
}

/**
 * Calculate complete payroll for an employee
 * Based on specification: Gross Salary = Basic Salary + Total OT Pay + Food Allowance
 *                        Net Salary = Gross Salary - Deductions
 */
export function calculateEmployeePayroll(
  employee: Employee,
  attendance: Attendance,
  monthlyLeaves: Leave[]
): {
  basicSalary: number;
  payableBasicSalary: number;
  otherAllowance: number;
  hourlyBasicSalary: number;
  otAmount: number;
  foodAllowance: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  breakdown: {
    otRates: {
      normal: number;
      friday: number;
      holiday: number;
    };
    otPay: {
      normal: number;
      friday: number;
      holiday: number;
    };
    workingDays: number;
    presentDays: number;
    absentDays: number;
  };
} {
  const workingDays = parseInt(attendance.working_days.toString()) || KUWAIT_WORKING_DAYS_PER_MONTH;
  const presentDays = parseInt(attendance.present_days.toString()) || 0;
  const absentDays = parseInt(attendance.absent_days.toString()) || 0;
  const hoursPerDay = resolveHoursPerDay(employee.working_hours);
  const workedHours = presentDays * hoursPerDay;
  
  // Get master basic salary for OT rate calculation
  const masterBasicSalary = getBasicSalary(employee);
  const hourlyBasicSalary = calculateHourlyBasicSalary(masterBasicSalary, hoursPerDay);
  
  // Calculate prorated basic salary based on worked days
  const proratedBasicSalary = calculateProratedBasicSalary(masterBasicSalary, presentDays);
  
  // Calculate prorated other allowance
  const otherAllowance = parseFloat(employee.other_allowance || "0");
  const proratedOtherAllowance = calculateProratedOtherAllowance(otherAllowance, presentDays);
  
  // Calculate OT
  const ot = calculateOvertimeAmount(employee, attendance);
  
  // Calculate prorated food allowance (category-based)
  const foodAllowance = calculateFoodAllowance(employee, presentDays);
  
  // Calculate Gross Salary: Prorated Basic + Prorated Other + Prorated Food + Total OT Pay
  const grossSalary = proratedBasicSalary + proratedOtherAllowance + foodAllowance + ot.pay.total;
  
  // Deductions (can be extended in future)
  const totalDeductions = 0;
  
  // Calculate Net Salary: Gross Salary - Deductions
  const netSalaryRaw = grossSalary - totalDeductions;
  
  // Apply rounding: if decimal >= 0.5 round up, else round down
  const netSalary = Math.round(netSalaryRaw);
  
  return {
    basicSalary: masterBasicSalary,
    payableBasicSalary: proratedBasicSalary,
    otherAllowance: proratedOtherAllowance,
    hourlyBasicSalary,
    otAmount: ot.pay.total,
    foodAllowance,
    grossSalary,
    deductions: totalDeductions,
    netSalary,
    breakdown: {
      otRates: ot.rates,
      otPay: {
        normal: ot.pay.normal,
        friday: ot.pay.friday,
        holiday: ot.pay.holiday,
      },
      workingDays,
      presentDays,
      absentDays,
    },
  };
}

/**
 * Format currency for Kuwait (KWD)
 */
export function formatKWD(amount: number): string {
  return `${amount.toFixed(3)} KWD`;
}
