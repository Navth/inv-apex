/**
 * Kuwait Labor Law Constants and Application Configuration
 * 
 * This file centralizes all constants used throughout the payroll system
 * to ensure consistency and easy maintenance.
 */

// =============================================================================
// WORKING HOURS & DAYS
// =============================================================================

/** Standard working days per month in Kuwait */
export const KUWAIT_WORKING_DAYS_PER_MONTH = 26;

/** Default working hours per day */
export const DEFAULT_WORKING_HOURS_PER_DAY = 8;

/** Standard monthly working hours (26 days × 8 hours) */
export const STANDARD_MONTHLY_HOURS = KUWAIT_WORKING_DAYS_PER_MONTH * DEFAULT_WORKING_HOURS_PER_DAY;

// =============================================================================
// OVERTIME MULTIPLIERS (Kuwait Labor Law)
// =============================================================================

export const OT_MULTIPLIERS = {
  /** Normal weekday overtime: 1.25× hourly rate */
  NORMAL: 1.25,
  /** Friday overtime: 1.5× hourly rate */
  FRIDAY: 1.50,
  /** Public holiday overtime: 2× hourly rate */
  HOLIDAY: 2.00,
} as const;

// =============================================================================
// INDEMNITY CALCULATION
// =============================================================================

/** Days of salary per year for first 5 years of service */
export const INDEMNITY_FIRST_5_YEARS_DAYS = 15;

/** Days of salary per year after 5 years of service */
export const INDEMNITY_AFTER_5_YEARS_DAYS = 30;

/** Number of years threshold for indemnity calculation change */
export const INDEMNITY_YEARS_THRESHOLD = 5;

/** Days in a month for indemnity calculation */
export const DAYS_IN_MONTH = 30;

// =============================================================================
// SPECIAL RULES
// =============================================================================

/** OT percentage for Rehab department indirect employees */
export const REHAB_INDIRECT_OT_PERCENTAGE = 0.70;

// =============================================================================
// FOOD ALLOWANCE
// =============================================================================

/** Accommodation types that qualify for food allowance */
export const FOOD_ALLOWANCE_ELIGIBLE_ACCOMMODATIONS = ['own'] as const;

/** Employee categories eligible for food allowance */
export const FOOD_ALLOWANCE_ELIGIBLE_CATEGORIES = ['indirect'] as const;

// =============================================================================
// PAYROLL DEFAULTS
// =============================================================================

export const PAYROLL_DEFAULTS = {
  HOURS_PER_DAY: DEFAULT_WORKING_HOURS_PER_DAY,
  DEDUCTIONS: 0,
} as const;

// =============================================================================
// EMPLOYEE STATUS
// =============================================================================

export const EMPLOYEE_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

// =============================================================================
// LEAVE STATUS
// =============================================================================

export const LEAVE_STATUS = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

// =============================================================================
// INDEMNITY STATUS
// =============================================================================

export const INDEMNITY_STATUS = {
  ACTIVE: 'Active',
  PAID: 'Paid',
} as const;

// =============================================================================
// DATE FORMATS
// =============================================================================

export const DATE_FORMATS = {
  /** Month format for payroll and attendance (MM-YYYY) */
  MONTH: 'MM-YYYY',
} as const;

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type EmployeeStatus = typeof EMPLOYEE_STATUS[keyof typeof EMPLOYEE_STATUS];
export type LeaveStatus = typeof LEAVE_STATUS[keyof typeof LEAVE_STATUS];
export type IndemnityStatus = typeof INDEMNITY_STATUS[keyof typeof INDEMNITY_STATUS];
