/**
 * Salary History API
 * 
 * Provides access to employee salary history for historical payroll accuracy.
 * When an employee's salary changes, you can store snapshots of their salary
 * for specific months to ensure past payroll reports remain accurate.
 */

import { api } from "./client";

export interface EmployeeSalaryHistory {
  id: number;
  emp_id: string;
  basic_salary: string;
  other_allowance: string;
  food_allowance_amount: string;
  food_allowance_type: string;
  working_hours: number;
  ot_rate_normal: string;
  ot_rate_friday: string;
  ot_rate_holiday: string;
  effective_month: string;
  effective_from_day: number | null;
  category: string;
  accommodation: string;
  source: "system" | "migrated";
  created_at: string;
  notes: string | null;
}

export interface CreateSalaryHistoryRequest {
  emp_id: string;
  basic_salary: string;
  other_allowance?: string;
  food_allowance_amount?: string;
  food_allowance_type?: string;
  working_hours?: number;
  ot_rate_normal?: string;
  ot_rate_friday?: string;
  ot_rate_holiday?: string;
  effective_month: string;
  effective_from_day?: number | null;
  category?: string;
  accommodation?: string;
  source?: "system" | "migrated";
  notes?: string;
}

export interface BulkCreateResponse {
  message: string;
  created: number;
  skipped: number;
  skippedEmpIds: string[];
}

export interface BulkImportRecord {
  emp_id: string;
  effective_month: string;
  basic_salary: string | number;
  other_allowance?: string | number;
  food_allowance_amount?: string | number;
  food_allowance_type?: string;
  working_hours?: number;
  effective_from_day?: number | null;
  category?: string;
  accommodation?: string;
  notes?: string;
}

export interface BulkImportResponse {
  message: string;
  created: number;
  skipped: number;
  skippedDetails?: string[];
  errors?: { row: number; emp_id: string; error: string }[];
}

export const salaryHistoryApi = {
  /**
   * Get all salary history records for an employee
   */
  getByEmployee: async (empId: string): Promise<EmployeeSalaryHistory[]> => {
    return api.get<EmployeeSalaryHistory[]>(`/api/salary-history/employee/${empId}`);
  },

  /**
   * Get salary for a specific employee and month
   */
  getSalaryForMonth: async (empId: string, month: string): Promise<EmployeeSalaryHistory | null> => {
    try {
      return await api.get<EmployeeSalaryHistory>(`/api/salary-history/employee/${empId}/month/${month}`);
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get all salary records for a specific month (all employees)
   */
  getAllForMonth: async (month: string): Promise<EmployeeSalaryHistory[]> => {
    return api.get<EmployeeSalaryHistory[]>(`/api/salary-history/month/${month}`);
  },

  /**
   * Create a new salary history record
   */
  create: async (data: CreateSalaryHistoryRequest): Promise<EmployeeSalaryHistory> => {
    return api.post<EmployeeSalaryHistory>('/api/salary-history', data);
  },

  /**
   * Update a salary history record
   */
  update: async (id: number, updates: Partial<CreateSalaryHistoryRequest>): Promise<EmployeeSalaryHistory> => {
    return api.patch<EmployeeSalaryHistory>(`/api/salary-history/${id}`, updates);
  },

  /**
   * Delete a salary history record
   */
  delete: async (id: number): Promise<{ success: boolean }> => {
    return api.delete<{ success: boolean }>(`/api/salary-history/${id}`);
  },

  /**
   * Bulk create salary history from current employee data
   * This creates a snapshot of all employee salaries for a specific month
   */
  bulkCreateFromEmployees: async (month: string, overwrite: boolean = false): Promise<BulkCreateResponse> => {
    return api.post<BulkCreateResponse>(
      `/api/salary-history/bulk-create/${month}?overwrite=${overwrite}`
    );
  },

  /**
   * Bulk import from migration file (Excel/CSV parsed on client)
   */
  bulkImport: async (
    records: BulkImportRecord[],
    overwrite: boolean = false
  ): Promise<BulkImportResponse> => {
    return api.post<BulkImportResponse>("/api/salary-history/bulk-import", {
      records,
      overwrite,
    });
  },
};
