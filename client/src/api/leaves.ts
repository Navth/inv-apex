/**
 * Leaves API
 */

import api from './client';
import type { Leave, InsertLeave } from '@shared/schema';

/**
 * Get all leaves, optionally filtered by status
 */
export async function getLeaves(status?: string): Promise<Leave[]> {
  const url = status 
    ? `/api/leaves?status=${encodeURIComponent(status)}`
    : '/api/leaves';
  return api.get<Leave[]>(url);
}

/**
 * Get leaves for a specific employee
 */
export async function getEmployeeLeaves(empId: string): Promise<Leave[]> {
  return api.get<Leave[]>(`/api/leaves/employee/${encodeURIComponent(empId)}`);
}

/**
 * Get a single leave request by ID
 */
export async function getLeave(id: number): Promise<Leave> {
  return api.get<Leave>(`/api/leaves/${id}`);
}

/**
 * Create a new leave request
 */
export async function createLeave(leave: InsertLeave): Promise<Leave> {
  return api.post<Leave>('/api/leaves', leave);
}

/**
 * Approve a leave request
 */
export async function approveLeave(id: number): Promise<Leave> {
  return api.patch<Leave>(`/api/leaves/${id}/approve`);
}

/**
 * Reject a leave request
 */
export async function rejectLeave(id: number): Promise<Leave> {
  return api.patch<Leave>(`/api/leaves/${id}/reject`);
}

export const leavesApi = {
  getAll: getLeaves,
  getByEmployee: getEmployeeLeaves,
  getOne: getLeave,
  create: createLeave,
  approve: approveLeave,
  reject: rejectLeave,
};

export default leavesApi;
