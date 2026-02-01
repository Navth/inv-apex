/**
 * Indemnity API
 */

import api from './client';
import type { Indemnity, InsertIndemnity } from '@shared/schema';

/**
 * Get all indemnity records
 */
export async function getIndemnity(): Promise<Indemnity[]> {
  return api.get<Indemnity[]>('/api/indemnity');
}

/**
 * Get indemnity for a specific employee
 */
export async function getEmployeeIndemnity(empId: string): Promise<Indemnity> {
  return api.get<Indemnity>(`/api/indemnity/${encodeURIComponent(empId)}`);
}

/**
 * Calculate indemnity for all employees
 */
export async function calculateIndemnity(): Promise<{ message: string; created: Indemnity[] }> {
  return api.post('/api/indemnity/calculate');
}

/**
 * Mark indemnity as paid
 */
export async function markIndemnityPaid(empId: string, indemnityAmount?: string): Promise<Indemnity> {
  return api.patch<Indemnity>(
    `/api/indemnity/${encodeURIComponent(empId)}/pay`,
    indemnityAmount ? { indemnity_amount: indemnityAmount } : undefined
  );
}

export const indemnityApi = {
  getAll: getIndemnity,
  getByEmployee: getEmployeeIndemnity,
  calculate: calculateIndemnity,
  markPaid: markIndemnityPaid,
};

export default indemnityApi;
