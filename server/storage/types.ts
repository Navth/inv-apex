import type {
  User,
  InsertUser,
  Dept,
  InsertDept,
  Employee,
  InsertEmployee,
  Attendance,
  InsertAttendance,
  Payroll,
  InsertPayroll,
  Leave,
  InsertLeave,
  Indemnity,
  InsertIndemnity,
  EmployeeSalaryHistory,
  InsertEmployeeSalaryHistory,
  EmployeeFoodAllowanceMonthly,
  InsertEmployeeFoodAllowanceMonthly,
} from "@shared/schema";

/** Employee with department name joined (for payroll/reports that need dept name) */
export type EmployeeWithDeptName = Employee & { department_name: string };

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Departments
  getDepts(): Promise<Dept[]>;
  getDept(id: number): Promise<Dept | undefined>;
  createDept(data: InsertDept): Promise<Dept>;
  updateDept(id: number, data: Partial<InsertDept>): Promise<Dept | undefined>;
  deleteDept(id: number): Promise<boolean>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployeesWithDeptName(): Promise<EmployeeWithDeptName[]>;
  getEmployee(empId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(empId: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(empId: string): Promise<boolean>;
  getEmployeesByDept(deptId: number): Promise<Employee[]>;

  // Attendance
  getAttendance(month?: string, deptId?: number): Promise<Attendance[]>;
  getAttendanceByEmployee(empId: string, month?: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  bulkCreateAttendance(attendances: InsertAttendance[]): Promise<Attendance[]>;
  deleteAttendanceByMonthAndEmpIds(month: string, empIds: string[]): Promise<void>;
  /** Delete attendance for a month that is tagged with this dept (for replace-by-dept uploads; keeps other depts' rows). */
  deleteAttendanceByMonthAndDept(month: string, deptId: number): Promise<void>;
  /** Delete all attendance records for a month (optionally only for a department). */
  deleteAttendanceByMonth(month: string, deptId?: number): Promise<number>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;

  // Payroll
  getPayroll(month?: string, deptId?: number): Promise<Payroll[]>;
  getPayrollByEmployee(empId: string, month?: string): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  bulkCreatePayroll(payrolls: InsertPayroll[]): Promise<Payroll[]>;
  updatePayroll(empId: string, month: string, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  deletePayroll(month: string): Promise<void>;
  deletePayrollCalculatedOnly(month: string): Promise<void>;
  deletePayrollForEmployees(month: string, empIds: string[]): Promise<void>;

  // Leaves
  getLeaves(status?: string): Promise<Leave[]>;
  getLeavesByEmployee(empId: string): Promise<Leave[]>;
  getLeave(id: number): Promise<Leave | undefined>;
  createLeave(leave: InsertLeave): Promise<Leave>;
  updateLeave(id: number, leave: Partial<Leave>): Promise<Leave | undefined>;

  // Indemnity
  getIndemnity(): Promise<Indemnity[]>;
  getIndemnityByEmployee(empId: string): Promise<Indemnity | undefined>;
  createIndemnity(indemnity: InsertIndemnity): Promise<Indemnity>;
  updateIndemnity(empId: string, indemnity: Partial<InsertIndemnity>): Promise<Indemnity | undefined>;

  // Employee Salary History
  getSalaryHistory(empId: string): Promise<EmployeeSalaryHistory[]>;
  getSalaryForMonth(empId: string, month: string): Promise<EmployeeSalaryHistory | undefined>;
  getEffectiveSalaryForMonth(empId: string, month: string): Promise<EmployeeSalaryHistory | undefined>;
  getSalarySegmentsForMonth(empId: string, month: string): Promise<EmployeeSalaryHistory[]>;
  getAllSalariesForMonth(month: string): Promise<EmployeeSalaryHistory[]>;
  createSalaryHistory(history: InsertEmployeeSalaryHistory): Promise<EmployeeSalaryHistory>;
  updateSalaryHistory(id: number, updates: Partial<InsertEmployeeSalaryHistory>): Promise<EmployeeSalaryHistory | undefined>;
  deleteSalaryHistory(id: number): Promise<boolean>;

  // Employee Food Allowance (separate worksheet / monthly override)
  getFoodAllowanceForMonth(month: string): Promise<{ emp_id: string; amount: string }[]>;
  setFoodAllowanceForMonth(empId: string, month: string, amount: number): Promise<EmployeeFoodAllowanceMonthly>;
  bulkSetFoodAllowance(entries: { emp_id: string; month: string; amount: number }[]): Promise<void>;
}

export type { User, InsertUser, Dept, InsertDept, Employee, InsertEmployee, Attendance, InsertAttendance, Payroll, InsertPayroll, Leave, InsertLeave, Indemnity, InsertIndemnity, EmployeeSalaryHistory, InsertEmployeeSalaryHistory, EmployeeFoodAllowanceMonthly, InsertEmployeeFoodAllowanceMonthly };
