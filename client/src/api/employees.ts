/**
 * Employees API
 */

import api from './client';
import type { Employee, InsertEmployee } from '@shared/schema';

/**
 * Get all employees
 */
export async function getEmployees(): Promise<Employee[]> {
  return api.get<Employee[]>('/api/employees');
}

/**
 * Get a single employee by ID
 */
export async function getEmployee(empId: string): Promise<Employee> {
  return api.get<Employee>(`/api/employees/${encodeURIComponent(empId)}`);
}

/**
 * Create a new employee
 */
export async function createEmployee(employee: InsertEmployee): Promise<Employee> {
  return api.post<Employee>('/api/employees', employee);
}

/**
 * Update an employee
 */
export async function updateEmployee(empId: string, updates: Partial<InsertEmployee>): Promise<Employee> {
  return api.patch<Employee>(`/api/employees/${encodeURIComponent(empId)}`, updates);
}

/**
 * Delete an employee
 */
export async function deleteEmployee(empId: string): Promise<void> {
  await api.delete(`/api/employees/${encodeURIComponent(empId)}`);
}

/**
 * Bulk create employees
 */
export async function bulkCreateEmployees(employees: Partial<InsertEmployee>[]): Promise<{ count: number; created: Employee[] }> {
  return api.post('/api/employees/bulk', { employees });
}

export const employeesApi = {
  getAll: getEmployees,
  getOne: getEmployee,
  create: createEmployee,
  update: updateEmployee,
  delete: deleteEmployee,
  bulkCreate: bulkCreateEmployees,
};

export default employeesApi;
