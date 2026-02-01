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
 * Bulk create attendance records
 */
export async function bulkCreateAttendance(attendances: InsertAttendance[]): Promise<Attendance[]> {
  return api.post<Attendance[]>('/api/attendance/bulk', attendances);
}

export const attendanceApi = {
  getAll: getAttendance,
  getByEmployee: getEmployeeAttendance,
  create: createAttendance,
  bulkCreate: bulkCreateAttendance,
};

export default attendanceApi;
