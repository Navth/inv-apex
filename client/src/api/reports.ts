/**
 * Reports API
 */

import api from './client';

export interface ReportRow {
  emp_id: string;
  name: string;
  designation: string;
  department: string;
  salary: number;
  worked_days: number;
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
}

/**
 * Get monthly report
 */
export async function getReport(month: string): Promise<ReportRow[]> {
  return api.get<ReportRow[]>(`/api/reports?month=${encodeURIComponent(month)}`);
}

export const reportsApi = {
  get: getReport,
};

export default reportsApi;
