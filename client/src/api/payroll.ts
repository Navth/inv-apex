/**
 * Payroll API
 */

import api from './client';
import type { Payroll, InsertPayroll } from '@shared/schema';

export interface PayrollWithContext extends Payroll {
  contract_basic_salary?: number;
  working_days?: number;
  hours_per_day?: number;
  scheduled_hours?: number;
  name?: string;
  comments?: string;
}

export interface PayrollGenerateResponse {
  created: Payroll[];
  count: number;
  message: string;
  warnings?: Array<{
    emp_id: string;
    name: string;
    error: string;
  }>;
}

/**
 * Get payroll records, optionally filtered by month
 */
export async function getPayroll(month?: string): Promise<PayrollWithContext[]> {
  const url = month 
    ? `/api/payroll?month=${encodeURIComponent(month)}`
    : '/api/payroll';
  return api.get<PayrollWithContext[]>(url);
}

/**
 * Get payroll for a specific employee
 */
export async function getEmployeePayroll(empId: string, month?: string): Promise<PayrollWithContext[]> {
  const url = month
    ? `/api/payroll/${encodeURIComponent(empId)}?month=${encodeURIComponent(month)}`
    : `/api/payroll/${encodeURIComponent(empId)}`;
  return api.get<PayrollWithContext[]>(url);
}

/**
 * Update payroll record for an employee
 */
export async function updatePayroll(
  empId: string, 
  month: string, 
  updates: Partial<InsertPayroll>
): Promise<Payroll> {
  return api.patch<Payroll>(
    `/api/payroll/${encodeURIComponent(empId)}`,
    { month, ...updates }
  );
}

/**
 * Generate payroll for a given month
 */
export async function generatePayroll(month: string): Promise<PayrollGenerateResponse> {
  return api.post<PayrollGenerateResponse>('/api/payroll/generate', { month });
}

export const payrollApi = {
  getAll: getPayroll,
  getByEmployee: getEmployeePayroll,
  update: updatePayroll,
  generate: generatePayroll,
};

export default payrollApi;
