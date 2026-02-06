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
 * Get payroll records, optionally filtered by month and/or dept_id
 */
export async function getPayroll(month?: string, deptId?: number | null): Promise<PayrollWithContext[]> {
  const params = new URLSearchParams();
  if (month) params.set('month', month);
  if (deptId != null) params.set('dept_id', String(deptId));
  const qs = params.toString();
  const url = qs ? `/api/payroll?${qs}` : '/api/payroll';
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
 * Generate payroll for a given month. Pass dept_id to generate only for that department; omit for everyone.
 */
export async function generatePayroll(
  month: string,
  options?: { dept_id?: number | null }
): Promise<PayrollGenerateResponse> {
  const body: { month: string; dept_id?: number } = { month };
  if (options?.dept_id != null) body.dept_id = options.dept_id;
  return api.post<PayrollGenerateResponse>('/api/payroll/generate', body);
}

export const payrollApi = {
  getAll: getPayroll,
  getByEmployee: getEmployeePayroll,
  update: updatePayroll,
  generate: generatePayroll,
};

export default payrollApi;
