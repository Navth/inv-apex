import type {
  User,
  InsertUser,
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
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Employees
  getEmployees(): Promise<Employee[]>;
  getEmployee(empId: string): Promise<Employee | undefined>;
  createEmployee(employee: InsertEmployee): Promise<Employee>;
  updateEmployee(empId: string, employee: Partial<InsertEmployee>): Promise<Employee | undefined>;
  deleteEmployee(empId: string): Promise<boolean>;

  // Attendance
  getAttendance(month?: string): Promise<Attendance[]>;
  getAttendanceByEmployee(empId: string, month?: string): Promise<Attendance[]>;
  createAttendance(attendance: InsertAttendance): Promise<Attendance>;
  bulkCreateAttendance(attendances: InsertAttendance[]): Promise<Attendance[]>;
  updateAttendance(id: number, attendance: Partial<InsertAttendance>): Promise<Attendance | undefined>;
  deleteAttendance(id: number): Promise<boolean>;

  // Payroll
  getPayroll(month?: string): Promise<Payroll[]>;
  getPayrollByEmployee(empId: string, month?: string): Promise<Payroll[]>;
  createPayroll(payroll: InsertPayroll): Promise<Payroll>;
  bulkCreatePayroll(payrolls: InsertPayroll[]): Promise<Payroll[]>;
  updatePayroll(empId: string, month: string, payroll: Partial<InsertPayroll>): Promise<Payroll | undefined>;
  deletePayroll(month: string): Promise<void>;

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
}

export type { User, InsertUser, Employee, InsertEmployee, Attendance, InsertAttendance, Payroll, InsertPayroll, Leave, InsertLeave, Indemnity, InsertIndemnity };
