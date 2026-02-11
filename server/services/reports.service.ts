/**
 * Reports Service
 * 
 * This service generates reports by combining employee, attendance, and payroll data.
 */

import type { Employee, Attendance, Payroll } from "@shared/schema";
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

export interface ReportRow {
  emp_id: string;
  name: string;
  designation: string;
  department: string;
  salary: number;
  /** Days used for salary proration (round-off from sheet when present, else present days) */
  worked_days: number;
  /** Total working days in the period (from sheet); may differ from worked_days when round-off is used */
  working_days: number;
  normal_ot: number;
  friday_ot: number;
  holiday_ot: number;
  food_allow: number;
  allowances_earned: number;
  dues_earned: number;
  deductions: number;
  gross_salary: number;
  total_earnings: number;
  comments: string;
  month: string;
  /** Salary earned (prorated basic) for detailed report */
  salary_earned?: number;
  not_earned?: number;
  fot_earned?: number;
  hot_earned?: number;
  accommodation?: string;
  project_place_of_work?: string;
  doj?: string;
  category?: string;
  leave_balance?: number | string;
  visa_cost_recovery?: number | string;
  count?: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getWorkingHoursPerDay(employee: Employee): number {
  const hours = Number(employee.working_hours ?? 0);
  return hours > 0 ? hours : DEFAULT_WORKING_HOURS_PER_DAY;
}

function calculateHourlyBasicSalary(monthlyBasicSalary: number, workingHoursPerDay: number): number {
  const totalMonthlyHours = KUWAIT_WORKING_DAYS_PER_MONTH * workingHoursPerDay;
  return monthlyBasicSalary / totalMonthlyHours;
}

function calculateProratedAmount(monthlyAmount: number, workedDays: number): number {
  if (monthlyAmount <= 0) return 0;
  
  if (workedDays >= KUWAIT_WORKING_DAYS_PER_MONTH) {
    return monthlyAmount;
  }
  
  return (monthlyAmount / KUWAIT_WORKING_DAYS_PER_MONTH) * workedDays;
}

type EmployeeWithDeptName = Employee & { department_name?: string };

function isRehabIndirect(employee: EmployeeWithDeptName): boolean {
  const deptName = employee.department_name ?? (employee as any).department;
  return String(deptName || '').toLowerCase() === 'rehab' && 
         employee.category?.toLowerCase() === 'indirect';
}

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
// REPORT GENERATION
// =============================================================================

/** Aggregate multiple attendance rows (e.g. from different depts) into one set of totals.
 * worked_days_for_salary: when round_off is present in any row we use sum(round_off), else sum(present_days). This is the value used for salary proration.
 */
function aggregateAttendanceForReport(records: Attendance[]): {
  working_days: number;
  present_days: number;
  rounded_off_days: number;
  worked_days_for_salary: number;
  ot_hours_normal: number;
  ot_hours_friday: number;
  ot_hours_holiday: number;
  dues_earned: number;
  comments: string;
} {
  const working_days = records.reduce((s, a) => s + (Number(a.working_days) || 0), 0);
  const present_days = records.reduce((s, a) => s + (Number(a.present_days) || 0), 0);
  const rounded_off_days = records.reduce((s, a) => s + (a.round_off ? parseFloat(String(a.round_off)) : 0), 0);
  const worked_days_for_salary = rounded_off_days > 0 ? rounded_off_days : present_days;
  return {
    working_days,
    present_days,
    rounded_off_days,
    worked_days_for_salary,
    ot_hours_normal: records.reduce((s, a) => s + parseFloat(String(a.ot_hours_normal || "0")), 0),
    ot_hours_friday: records.reduce((s, a) => s + parseFloat(String(a.ot_hours_friday || "0")), 0),
    ot_hours_holiday: records.reduce((s, a) => s + parseFloat(String(a.ot_hours_holiday || "0")), 0),
    dues_earned: records.reduce((s, a) => s + parseFloat(String(a.dues_earned || "0")), 0),
    comments: records.map((a) => a.comments).filter(Boolean).join("; "),
  };
}

/**
 * Generate monthly report combining employee, attendance, and payroll data.
 * Attendance can have multiple rows per employee per month (e.g. mid-month transfer); we aggregate them.
 */
export function generateMonthlyReport(
  employees: Employee[],
  attendances: Attendance[],
  payrolls: Payroll[],
  month: string
): ReportRow[] {
  // Per-employee aggregated attendance (multiple rows per emp/month when transferred between depts)
  const attendanceByEmp = new Map<string, Attendance[]>();
  for (const a of attendances) {
    if (a.month === month) {
      const list = attendanceByEmp.get(a.emp_id) ?? [];
      list.push(a);
      attendanceByEmp.set(a.emp_id, list);
    }
  }
  
  const payrollMap = new Map<string, Payroll>();
  for (const p of payrolls) {
    if (p.month === month) {
      payrollMap.set(p.emp_id, p);
    }
  }
  
  const rows: ReportRow[] = [];
  
  for (const employee of employees) {
    const empAttendances = attendanceByEmp.get(employee.emp_id) ?? [];
    const aggregated = empAttendances.length > 0 ? aggregateAttendanceForReport(empAttendances) : null;
    const payroll = payrollMap.get(employee.emp_id);
    
    // Get attendance data (aggregated when multiple rows).
    // Worked days for salary: use round-off when present in sheet, else present_days. Payroll.days_worked is the rounded value used.
    const worked_days_for_salary = aggregated?.worked_days_for_salary ?? aggregated?.present_days ?? 0;
    const worked_days = payroll ? Number(payroll.days_worked ?? 0) : Math.round(worked_days_for_salary);
    const working_days = aggregated?.working_days ?? 0;
    const normal_ot = aggregated?.ot_hours_normal ?? 0;
    const friday_ot = aggregated?.ot_hours_friday ?? 0;
    const holiday_ot = aggregated?.ot_hours_holiday ?? 0;
    
    // Base salary calculations
    const master_basic_salary = Number(employee.basic_salary ?? 0);
    const workingHoursPerDay = getWorkingHoursPerDay(employee);
    const hourlyBasicSalary = calculateHourlyBasicSalary(master_basic_salary, workingHoursPerDay);
    
    // Calculate prorated amounts
    const prorated_basic = calculateProratedAmount(master_basic_salary, worked_days);
    const other_allowance = Number(employee.other_allowance ?? 0);
    const prorated_other = calculateProratedAmount(other_allowance, worked_days);
    
    // Calculate OT rates
    const customRateNormal = Number(employee.ot_rate_normal ?? 0);
    const customRateFriday = Number(employee.ot_rate_friday ?? 0);
    const customRateHoliday = Number(employee.ot_rate_holiday ?? 0);
    
    const rate_normal = customRateNormal > 0 ? customRateNormal : hourlyBasicSalary * OT_MULTIPLIERS.NORMAL;
    const rate_friday = customRateFriday > 0 ? customRateFriday : hourlyBasicSalary * OT_MULTIPLIERS.FRIDAY;
    const rate_holiday = customRateHoliday > 0 ? customRateHoliday : hourlyBasicSalary * OT_MULTIPLIERS.HOLIDAY;
    
    // Calculate OT amounts
    let ot_normal_amount = normal_ot * rate_normal;
    let ot_friday_amount = friday_ot * rate_friday;
    let ot_holiday_amount = holiday_ot * rate_holiday;
    
    // Apply Rehab indirect reduction
    if (isRehabIndirect(employee)) {
      ot_normal_amount *= REHAB_INDIRECT_OT_PERCENTAGE;
      ot_friday_amount *= REHAB_INDIRECT_OT_PERCENTAGE;
      ot_holiday_amount *= REHAB_INDIRECT_OT_PERCENTAGE;
    }
    
    const ot_amount_calc = ot_normal_amount + ot_friday_amount + ot_holiday_amount;
    
    // Food allowance calculation
    let food_allow_calc = 0;
    if (qualifiesForFoodAllowance(employee)) {
      const food_amount = Number(employee.food_allowance_amount ?? 0);
      if (food_amount > 0) {
        food_allow_calc = calculateProratedAmount(food_amount, worked_days);
      }
    }
    
    // Get dues earned
    const dues_earned_calc = aggregated?.dues_earned ?? 0;
    
    // Use persisted payroll values if available, otherwise calculated
    const food_allow = payroll ? Number(payroll.food_allowance ?? 0) : food_allow_calc;
    const ot_amount = payroll ? Number(payroll.ot_amount ?? 0) : ot_amount_calc;
    const dues_earned = payroll ? Number(payroll.dues_earned ?? 0) : dues_earned_calc;
    const deductions = payroll ? Number(payroll.deductions ?? 0) : 0;
    const gross_salary = payroll ? Number(payroll.gross_salary ?? 0) : (prorated_basic + prorated_other + food_allow + ot_amount);
    
    // Net Salary
    const net_salary_raw = payroll ? Number(payroll.net_salary ?? 0) : (gross_salary + dues_earned - deductions);
    const net_salary = Math.round(net_salary_raw);
    
    // Allowances earned (prorated other allowance, food is separate)
    const allowances_earned = prorated_other;
    
    const row: ReportRow = {
      emp_id: employee.emp_id,
      name: employee.name,
      designation: employee.designation,
      department: (employee as EmployeeWithDeptName).department_name ?? (employee as any).department ?? "",
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
      comments: aggregated?.comments ?? "",
      month,
      salary_earned: prorated_basic,
      not_earned: ot_normal_amount,
      fot_earned: ot_friday_amount,
      hot_earned: ot_holiday_amount,
      accommodation: employee.accommodation ?? "",
      project_place_of_work: (employee as EmployeeWithDeptName).department_name ?? (employee as any).department ?? "",
      doj: employee.doj ? String(employee.doj) : "",
      category: employee.category ?? "Direct",
      leave_balance: "",
      visa_cost_recovery: "",
      count: 1,
    };
    
    rows.push(row);
  }
  
  // Filter out employees with 0 worked days unless they have comments
  return rows.filter(row => {
    const hasComments = row.comments && row.comments.trim().length > 0;
    return row.worked_days > 0 || hasComments;
  });
}
