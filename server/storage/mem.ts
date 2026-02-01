import { randomUUID } from "crypto";
import type {
  Attendance,
  Employee,
  Indemnity,
  InsertAttendance,
  InsertEmployee,
  InsertIndemnity,
  InsertLeave,
  InsertPayroll,
  InsertUser,
  Leave,
  Payroll,
  User,
} from "@shared/schema";
import type { IStorage } from "./types";

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private employees: Map<string, Employee> = new Map();
  private attendance: Map<number, Attendance> = new Map();
  private payrolls: Map<number, Payroll> = new Map();
  private leaves: Map<number, Leave> = new Map();
  private indemnities: Map<string, Indemnity> = new Map();

  private employeeIdCounter = 1;
  private attendanceIdCounter = 1;
  private payrollIdCounter = 1;
  private leaveIdCounter = 1;
  private indemnityIdCounter = 1;

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEmployees(): Promise<Employee[]> {
    return Array.from(this.employees.values());
  }

  async getEmployee(empId: string): Promise<Employee | undefined> {
    return this.employees.get(empId);
  }

  async createEmployee(employee: InsertEmployee): Promise<Employee> {
    const newEmployee: Employee = {
      status: "active",
      ot_rate_normal: "0",
      ot_rate_friday: "0",
      ot_rate_holiday: "0",
      food_allowance_type: "none",
      food_allowance_amount: "0",
      category: "Direct",
      working_hours: 8,
      other_allowance: "0",
      indemnity_rate: "0",
      accommodation: "Own",
      ...employee,
    };
    this.employees.set(employee.emp_id, newEmployee);
    return newEmployee;
  }

  async updateEmployee(empId: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const employee = this.employees.get(empId);
    if (!employee) return undefined;
    const updated = { ...employee, ...updates };
    this.employees.set(empId, updated);
    return updated;
  }

  async deleteEmployee(empId: string): Promise<boolean> {
    return this.employees.delete(empId);
  }

  async getAttendance(month?: string): Promise<Attendance[]> {
    const all = Array.from(this.attendance.values());
    if (!month) return all;
    return all.filter((a) => a.month === month);
  }

  async getAttendanceByEmployee(empId: string, month?: string): Promise<Attendance[]> {
    const all = Array.from(this.attendance.values()).filter((a) => a.emp_id === empId);
    if (!month) return all;
    return all.filter((a) => a.month === month);
  }

  async createAttendance(attendance: InsertAttendance): Promise<Attendance> {
    const newAttendance: Attendance = {
      id: this.attendanceIdCounter++,
      ot_hours_normal: "0",
      ot_hours_friday: "0",
      ot_hours_holiday: "0",
      round_off: null,
      comments: null,
      dues_earned: "0",
      ...attendance,
      uploaded_at: new Date(),
    };
    this.attendance.set(newAttendance.id, newAttendance);
    return newAttendance;
  }

  async bulkCreateAttendance(attendances: InsertAttendance[]): Promise<Attendance[]> {
    const created: Attendance[] = [];
    for (const att of attendances) {
      const newAttendance = await this.createAttendance(att);
      created.push(newAttendance);
    }
    return created;
  }

  async updateAttendance(id: number, updates: Partial<InsertAttendance>): Promise<Attendance | undefined> {
    const attendance = this.attendance.get(id);
    if (!attendance) return undefined;
    const updated = { ...attendance, ...updates };
    this.attendance.set(id, updated);
    return updated;
  }

  async deleteAttendance(id: number): Promise<boolean> {
    return this.attendance.delete(id);
  }

  async getPayroll(month?: string): Promise<Payroll[]> {
    const all = Array.from(this.payrolls.values());
    if (!month) return all;
    return all.filter((p) => p.month === month);
  }

  async getPayrollByEmployee(empId: string, month?: string): Promise<Payroll[]> {
    const all = Array.from(this.payrolls.values()).filter((p) => p.emp_id === empId);
    if (!month) return all;
    return all.filter((p) => p.month === month);
  }

  async createPayroll(payroll: InsertPayroll): Promise<Payroll> {
    const newPayroll: Payroll = {
      id: this.payrollIdCounter++,
      ot_amount: "0",
      food_allowance: "0",
      deductions: "0",
      days_worked: 0,
      dues_earned: "0",
      ...payroll,
      generated_at: new Date(),
    };
    this.payrolls.set(newPayroll.id, newPayroll);
    return newPayroll;
  }

  async bulkCreatePayroll(payrolls: InsertPayroll[]): Promise<Payroll[]> {
    const created: Payroll[] = [];
    for (const pay of payrolls) {
      const newPayroll = await this.createPayroll(pay);
      created.push(newPayroll);
    }
    return created;
  }

  async updatePayroll(empId: string, month: string, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const all = Array.from(this.payrolls.values());
    const payroll = all.find((p) => p.emp_id === empId && p.month === month);
    if (!payroll) return undefined;
    const updated = { ...payroll, ...updates };
    this.payrolls.set(payroll.id, updated);
    return updated;
  }

  async deletePayroll(month: string): Promise<void> {
    const toDelete = Array.from(this.payrolls.entries())
      .filter(([, p]) => p.month === month)
      .map(([id]) => id);
    for (const id of toDelete) {
      this.payrolls.delete(id);
    }
  }

  async getLeaves(status?: string): Promise<Leave[]> {
    const all = Array.from(this.leaves.values());
    if (!status) return all;
    return all.filter((l) => l.status === status);
  }

  async getLeavesByEmployee(empId: string): Promise<Leave[]> {
    return Array.from(this.leaves.values()).filter((l) => l.emp_id === empId);
  }

  async getLeave(id: number): Promise<Leave | undefined> {
    return this.leaves.get(id);
  }

  async createLeave(leave: InsertLeave): Promise<Leave> {
    const newLeave: Leave = {
      id: this.leaveIdCounter++,
      status: "Pending",
      ...leave,
      submitted_at: new Date(),
      reviewed_at: null,
      reviewed_by: null,
    };
    this.leaves.set(newLeave.id, newLeave);
    return newLeave;
  }

  async updateLeave(id: number, updates: Partial<Leave>): Promise<Leave | undefined> {
    const leave = this.leaves.get(id);
    if (!leave) return undefined;
    const updated = { ...leave, ...updates };
    this.leaves.set(id, updated);
    return updated;
  }

  async getIndemnity(): Promise<Indemnity[]> {
    return Array.from(this.indemnities.values());
  }

  async getIndemnityByEmployee(empId: string): Promise<Indemnity | undefined> {
    return this.indemnities.get(empId);
  }

  async createIndemnity(indemnity: InsertIndemnity): Promise<Indemnity> {
    const newIndemnity: Indemnity = {
      id: this.indemnityIdCounter++,
      status: "Active",
      ...indemnity,
      updated_at: new Date(),
      paid_at: null,
    };
    this.indemnities.set(indemnity.emp_id, newIndemnity);
    return newIndemnity;
  }

  async updateIndemnity(empId: string, updates: Partial<InsertIndemnity>): Promise<Indemnity | undefined> {
    const indemnity = this.indemnities.get(empId);
    if (!indemnity) return undefined;
    const updated = { ...indemnity, ...updates, updated_at: new Date() };
    this.indemnities.set(empId, updated);
    return updated;
  }
}
