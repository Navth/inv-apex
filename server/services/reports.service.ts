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
  month_display: string; // e.g. "Jan-25"
  accommodation: string;
  project_place: string; // department/project
  name: string;
  designation: string;
  salary: number;
  worked_days: number;
  working_days: number;
  normal_ot: number;
  friday_ot: number;
  holiday_ot: number;
  deductions: number;
  salary_earned: number;
  food_allow: number;
  allowances_earned: number;
  dues_earned: number;
  not_earned: number;
  fot_earned: number;
  hot_earned: number;
  total_earnings: number;
  comments: string;
  visa_cost_recovery: number;
  doj: string;
  leave_balance: number | string;
  category: string;
  count: number;
  month: string;
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

function isRehabIndirect(employee: Employee): boolean {
  return employee.department?.toLowerCase() === 'rehab' && 
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

/**
 * Format month for display (e.g. "01-2025" -> "Jan-25")
 */
function formatMonthDisplay(month: string): string {
  if (!month || !/^\d{2}-\d{4}$/.test(month)) return month;
  const [mm, yyyy] = month.split("-");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const shortYear = yyyy.slice(-2);
  return `${monthNames[parseInt(mm, 10) - 1]}-${shortYear}`;
}

/**
 * Generate monthly report combining employee, attendance, payroll, and food money data
 * Format matches: emp id | Month | Accommodation | Project/place | Name | DESIGNATION | Salary | Worked Days | etc.
 */
/** Aggregate attendances for an employee - use round_off when available (same logic as payroll). Salary divisor is always 26. */
function aggregateAttendanceForReport(attendances: Attendance[]): { worked_days: number; working_days: number; normal_ot: number; friday_ot: number; holiday_ot: number; dues_earned: number; comments: string } {
  if (attendances.length === 0) return { worked_days: 0, working_days: 0, normal_ot: 0, friday_ot: 0, holiday_ot: 0, dues_earned: 0, comments: "" };
  const roundOffValues = attendances.map(a => a.round_off ? parseFloat(a.round_off.toString()) : 0).filter(v => v > 0);
  const roundedOff = roundOffValues.length > 0 ? Math.max(...roundOffValues) : 0;
  const presentSum = attendances.reduce((s, a) => s + (parseInt(a.present_days.toString()) || 0), 0);
  let worked_days = roundedOff > 0 ? roundedOff : presentSum;
  worked_days = Math.min(worked_days, KUWAIT_WORKING_DAYS_PER_MONTH); // Cap at 26 for salary; prevents 78 glitch
  const working_days = Math.max(...attendances.map(a => parseInt(a.working_days.toString()) || 0)); // Expected days in month (e.g. 27)
  const normal_ot = attendances.reduce((s, a) => s + parseFloat(a.ot_hours_normal || "0"), 0);
  const friday_ot = attendances.reduce((s, a) => s + parseFloat(a.ot_hours_friday || "0"), 0);
  const holiday_ot = attendances.reduce((s, a) => s + parseFloat(a.ot_hours_holiday || "0"), 0);
  const dues_earned = attendances.reduce((s, a) => s + parseFloat(a.dues_earned || "0"), 0);
  const comments = attendances.map(a => a.comments).filter(Boolean).join("; ").trim();
  return { worked_days, working_days, normal_ot, friday_ot, holiday_ot, dues_earned, comments };
}

export function generateMonthlyReport(
  employees: Employee[],
  attendances: Attendance[],
  payrolls: Payroll[],
  month: string,
  foodMoneyMap?: Map<string, number>
): ReportRow[] {
  const attendanceByEmp = new Map<string, Attendance[]>();
  for (const a of attendances) {
    if (a.month === month) {
      const list = attendanceByEmp.get(a.emp_id) || [];
      list.push(a);
      attendanceByEmp.set(a.emp_id, list);
    }
  }
  const payrollMap = new Map<string, Payroll>();
  for (const p of payrolls) {
    if (p.month === month) payrollMap.set(p.emp_id, p);
  }

  const rows: ReportRow[] = [];
  const monthDisplay = formatMonthDisplay(month);

  for (const employee of employees) {
    const empAttendances = attendanceByEmp.get(employee.emp_id) || [];
    const agg = aggregateAttendanceForReport(empAttendances);
    const payroll = payrollMap.get(employee.emp_id);

    const worked_days = payroll ? Number(payroll.days_worked ?? 0) : agg.worked_days;
    const normal_ot = agg.normal_ot;
    const friday_ot = Number(attendance?.ot_hours_friday ?? 0);
    const holiday_ot = Number(attendance?.ot_hours_holiday ?? 0);

    const master_basic_salary = Number(employee.basic_salary ?? 0);
    const workingHoursPerDay = getWorkingHoursPerDay(employee);
    const hourlyBasicSalary = calculateHourlyBasicSalary(master_basic_salary, workingHoursPerDay);

    const prorated_basic = calculateProratedAmount(master_basic_salary, worked_days);
    const other_allowance = Number(employee.other_allowance ?? 0);
    const prorated_other = calculateProratedAmount(other_allowance, worked_days);

    const customRateNormal = Number(employee.ot_rate_normal ?? 0);
    const customRateFriday = Number(employee.ot_rate_friday ?? 0);
    const customRateHoliday = Number(employee.ot_rate_holiday ?? 0);

    const rate_normal = customRateNormal > 0 ? customRateNormal : hourlyBasicSalary * OT_MULTIPLIERS.NORMAL;
    const rate_friday = customRateFriday > 0 ? customRateFriday : hourlyBasicSalary * OT_MULTIPLIERS.FRIDAY;
    const rate_holiday = customRateHoliday > 0 ? customRateHoliday : hourlyBasicSalary * OT_MULTIPLIERS.HOLIDAY;

    let not_earned = normal_ot * rate_normal;
    let fot_earned = friday_ot * rate_friday;
    let hot_earned = holiday_ot * rate_holiday;

    if (isRehabIndirect(employee)) {
      not_earned *= REHAB_INDIRECT_OT_PERCENTAGE;
      fot_earned *= REHAB_INDIRECT_OT_PERCENTAGE;
      hot_earned *= REHAB_INDIRECT_OT_PERCENTAGE;
    }

    const ot_amount_calc = not_earned + fot_earned + hot_earned;

    let food_allow_calc = 0;
    const worksheetFood = foodMoneyMap?.get(employee.emp_id);
    if (worksheetFood !== undefined && worksheetFood > 0) {
      food_allow_calc = worksheetFood;
    } else if (qualifiesForFoodAllowance(employee)) {
      const food_amount = Number(employee.food_allowance_amount ?? 0);
      if (food_amount > 0) food_allow_calc = calculateProratedAmount(food_amount, worked_days);
    }

    const dues_earned = payroll ? Number(payroll.dues_earned ?? 0) : agg.dues_earned;
    const deductions = payroll ? Number(payroll.deductions ?? 0) : 0;
    const food_allow = payroll ? Number(payroll.food_allowance ?? 0) : food_allow_calc;
    const gross_salary = payroll ? Number(payroll.gross_salary ?? 0) : (prorated_basic + prorated_other + food_allow + ot_amount_calc);
    const net_salary_raw = payroll ? Number(payroll.net_salary ?? 0) : (gross_salary + dues_earned - deductions);
    const total_earnings = Math.round(net_salary_raw);

    const doj = employee.doj ? String(employee.doj) : "";

    const row: ReportRow = {
      emp_id: employee.emp_id,
      month_display: monthDisplay,
      accommodation: String(employee.accommodation ?? ""),
      project_place: String(employee.department ?? ""),
      name: employee.name,
      designation: employee.designation,
      salary: master_basic_salary,
      worked_days,
      working_days,
      normal_ot,
      friday_ot,
      holiday_ot,
      deductions,
      salary_earned: prorated_basic,
      food_allow,
      allowances_earned: prorated_other,
      dues_earned,
      not_earned,
      fot_earned,
      hot_earned,
      total_earnings,
      comments: agg.comments,
      visa_cost_recovery: 0,
      doj,
      leave_balance: "",
      category: String(employee.category ?? "Direct"),
      count: 1,
      month,
    };

    rows.push(row);
  }

  return rows.filter((row) => row.worked_days > 0 || (row.comments && row.comments.trim().length > 0));
}
