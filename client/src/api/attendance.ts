/**
 * Attendance API
 */

import api from './client';
import type { Attendance, InsertAttendance } from '@shared/schema';

/**
 * Get attendance records, optionally filtered by month
 */
export async function getAttendance(month?: string): Promise<Attendance[]> {
  const url = month 
    ? `/api/attendance?month=${encodeURIComponent(month)}`
    : '/api/attendance';
  return api.get<Attendance[]>(url);
}

/**
 * Get attendance for a specific employee
 */
export async function getEmployeeAttendance(empId: string, month?: string): Promise<Attendance[]> {
  const url = month
    ? `/api/attendance/${encodeURIComponent(empId)}?month=${encodeURIComponent(month)}`
    : `/api/attendance/${encodeURIComponent(empId)}`;
  return api.get<Attendance[]>(url);
}

/**
 * Create a single attendance record
 */
export async function createAttendance(attendance: InsertAttendance): Promise<Attendance> {
  return api.post<Attendance>('/api/attendance', attendance);
}

/**
 * Bulk create attendance records.
 * Optionally pass deptId and month to upload by department (replaces existing attendance for that month for those employees).
 */
export async function bulkCreateAttendance(
  attendances: InsertAttendance[],
  options?: { dept_id: number; month: string }
): Promise<Attendance[]> {
  if (options?.dept_id != null && options?.month) {
    return api.post<Attendance[]>('/api/attendance/bulk', {
      dept_id: options.dept_id,
      month: options.month,
      attendances,
    });
  }
  return api.post<Attendance[]>('/api/attendance/bulk', attendances);
}

/**
 * Update an attendance record
 */
export async function updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance> {
  return api.patch<Attendance>(`/api/attendance/${id}`, updates);
}

/**
 * Delete an attendance record
 */
export async function deleteAttendance(id: number): Promise<{ success: boolean; message: string }> {
  return api.delete<{ success: boolean; message: string }>(`/api/attendance/${id}`);
}

export const attendanceApi = {
  getAll: getAttendance,
  getByEmployee: getEmployeeAttendance,
  create: createAttendance,
  bulkCreate: bulkCreateAttendance,
  update: updateAttendance,
  delete: deleteAttendance,
};

export default attendanceApi;
