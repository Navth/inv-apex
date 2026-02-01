/**
 * API Module Exports
 * 
 * Central export point for all API modules.
 */

export { api, APIError } from './client';
export { authApi, login, logout, checkAuth } from './auth';
export { employeesApi, getEmployees, getEmployee, createEmployee, updateEmployee, deleteEmployee, bulkCreateEmployees } from './employees';
export { attendanceApi, getAttendance, getEmployeeAttendance, createAttendance, bulkCreateAttendance } from './attendance';
export { payrollApi, getPayroll, getEmployeePayroll, updatePayroll, generatePayroll } from './payroll';
export { leavesApi, getLeaves, getEmployeeLeaves, getLeave, createLeave, approveLeave, rejectLeave } from './leaves';
export { indemnityApi, getIndemnity, getEmployeeIndemnity, calculateIndemnity, markIndemnityPaid } from './indemnity';
export { reportsApi, getReport } from './reports';

// Type exports
export type { LoginCredentials, LoginResponse, AuthCheckResponse } from './auth';
export type { PayrollWithContext, PayrollGenerateResponse } from './payroll';
export type { ReportRow } from './reports';
