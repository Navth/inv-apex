/**
 * Indemnity Calculation Service
 * 
 * This service handles all indemnity calculations based on Kuwait labor law.
 */

import type { Employee, InsertIndemnity } from "@shared/schema";
import {
  INDEMNITY_FIRST_5_YEARS_DAYS,
  INDEMNITY_AFTER_5_YEARS_DAYS,
  INDEMNITY_YEARS_THRESHOLD,
  DAYS_IN_MONTH,
  INDEMNITY_STATUS,
} from "../config/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface IndemnityCalculation {
  emp_id: string;
  yearsOfService: number;
  indemnityAmount: number;
  status: string;
}

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate years of service from date of joining
 */
export function calculateYearsOfService(doj: Date, referenceDate: Date = new Date()): number {
  const diffMs = referenceDate.getTime() - doj.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays / 365;
}

/**
 * Calculate indemnity amount based on Kuwait labor law
 * 
 * Formula:
 * - First 5 years: 15 days salary per year
 * - After 5 years: 30 days salary per year (full month)
 */
export function calculateIndemnityAmount(basicSalary: number, yearsOfService: number): number {
  let indemnityAmount = 0;
  
  if (yearsOfService <= INDEMNITY_YEARS_THRESHOLD) {
    // First 5 years: 15 days salary per year
    indemnityAmount = (basicSalary * INDEMNITY_FIRST_5_YEARS_DAYS / DAYS_IN_MONTH) * yearsOfService;
  } else {
    // First 5 years portion
    const firstFiveYears = (basicSalary * INDEMNITY_FIRST_5_YEARS_DAYS / DAYS_IN_MONTH) * INDEMNITY_YEARS_THRESHOLD;
    
    // Remaining years at full month rate
    const remainingYears = yearsOfService - INDEMNITY_YEARS_THRESHOLD;
    const afterFiveYears = (basicSalary * INDEMNITY_AFTER_5_YEARS_DAYS / DAYS_IN_MONTH) * remainingYears;
    
    indemnityAmount = firstFiveYears + afterFiveYears;
  }
  
  return indemnityAmount;
}

/**
 * Calculate indemnity for a single employee
 */
export function calculateEmployeeIndemnity(employee: Employee): IndemnityCalculation {
  const doj = new Date(employee.doj);
  const yearsOfService = calculateYearsOfService(doj);
  const basicSalary = parseFloat(employee.basic_salary);
  const indemnityAmount = calculateIndemnityAmount(basicSalary, yearsOfService);
  
  return {
    emp_id: employee.emp_id,
    yearsOfService,
    indemnityAmount,
    status: INDEMNITY_STATUS.ACTIVE,
  };
}

/**
 * Generate indemnity records for all employees
 */
export function generateIndemnityRecords(employees: Employee[]): InsertIndemnity[] {
  return employees.map(employee => {
    const calculation = calculateEmployeeIndemnity(employee);
    
    return {
      emp_id: calculation.emp_id,
      years_of_service: calculation.yearsOfService.toFixed(2),
      indemnity_amount: calculation.indemnityAmount.toFixed(2),
      status: calculation.status,
    };
  });
}

// =============================================================================
// DEBUG UTILITIES
// =============================================================================

export interface IndemnityDebugInfo {
  emp_id: string;
  name: string;
  doj: string;
  basicSalary: number;
  yearsOfService: number;
  firstFiveYearsPortion: number;
  afterFiveYearsPortion: number;
  totalIndemnity: number;
}

/**
 * Generate debug info for indemnity calculation
 */
export function getIndemnityDebugInfo(employee: Employee): IndemnityDebugInfo {
  const doj = new Date(employee.doj);
  const yearsOfService = calculateYearsOfService(doj);
  const basicSalary = parseFloat(employee.basic_salary);
  
  let firstFiveYearsPortion = 0;
  let afterFiveYearsPortion = 0;
  
  if (yearsOfService <= INDEMNITY_YEARS_THRESHOLD) {
    firstFiveYearsPortion = (basicSalary * INDEMNITY_FIRST_5_YEARS_DAYS / DAYS_IN_MONTH) * yearsOfService;
  } else {
    firstFiveYearsPortion = (basicSalary * INDEMNITY_FIRST_5_YEARS_DAYS / DAYS_IN_MONTH) * INDEMNITY_YEARS_THRESHOLD;
    const remainingYears = yearsOfService - INDEMNITY_YEARS_THRESHOLD;
    afterFiveYearsPortion = (basicSalary * INDEMNITY_AFTER_5_YEARS_DAYS / DAYS_IN_MONTH) * remainingYears;
  }
  
  return {
    emp_id: employee.emp_id,
    name: employee.name,
    doj: employee.doj,
    basicSalary,
    yearsOfService,
    firstFiveYearsPortion,
    afterFiveYearsPortion,
    totalIndemnity: firstFiveYearsPortion + afterFiveYearsPortion,
  };
}
