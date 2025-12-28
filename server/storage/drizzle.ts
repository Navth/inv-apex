import { and, eq } from "drizzle-orm";
import {
  users,
  employees,
  attendance as attendanceTable,
  payroll as payrollTable,
  leaves as leavesTable,
  indemnity as indemnityTable,
  type Attendance,
  type Employee,
  type Indemnity,
  type InsertAttendance,
  type InsertEmployee,
  type InsertIndemnity,
  type InsertLeave,
  type InsertPayroll,
  type InsertUser,
  type Leave,
  type Payroll,
  type User,
} from "@shared/schema";
import type { IStorage } from "./types";

export class DrizzleStorage implements IStorage {
  constructor(private db: any) {}

  async getUser(id: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const rows = await this.db.insert(users).values(insertUser).returning();
    return rows[0];
  }

  async getEmployees(): Promise<Employee[]> {
    return await this.db.select().from(employees);
  }

  async getEmployee(empId: string): Promise<Employee | undefined> {
    const rows = await this.db.select().from(employees).where(eq(employees.emp_id, empId)).limit(1);
    return rows[0];
  }

  async createEmployee(employeeData: InsertEmployee): Promise<Employee> {
    const rows = await this.db.insert(employees).values(employeeData).returning();
    return rows[0];
  }

  async updateEmployee(empId: string, updates: Partial<InsertEmployee>): Promise<Employee | undefined> {
    const rows = await this.db.update(employees).set(updates).where(eq(employees.emp_id, empId)).returning();
    return rows[0];
  }

  async deleteEmployee(empId: string): Promise<boolean> {
    const rows = await this.db.delete(employees).where(eq(employees.emp_id, empId)).returning({ emp_id: employees.emp_id });
    return rows.length > 0;
  }

  async getAttendance(month?: string): Promise<Attendance[]> {
    if (month) return await this.db.select().from(attendanceTable).where(eq(attendanceTable.month, month));
    return await this.db.select().from(attendanceTable);
  }

  async getAttendanceByEmployee(empId: string, month?: string): Promise<Attendance[]> {
    if (month)
      return await this.db
        .select()
        .from(attendanceTable)
        .where(and(eq(attendanceTable.emp_id, empId), eq(attendanceTable.month, month)));
    return await this.db.select().from(attendanceTable).where(eq(attendanceTable.emp_id, empId));
  }

  async createAttendance(data: InsertAttendance): Promise<Attendance> {
    const rows = await this.db.insert(attendanceTable).values(data).returning();
    return rows[0];
  }

  async bulkCreateAttendance(attendances: InsertAttendance[]): Promise<Attendance[]> {
    if (attendances.length === 0) return [];
    const rows = await this.db.insert(attendanceTable).values(attendances).returning();
    return rows;
  }

  async getPayroll(month?: string): Promise<Payroll[]> {
    if (month) return await this.db.select().from(payrollTable).where(eq(payrollTable.month, month));
    return await this.db.select().from(payrollTable);
  }

  async getPayrollByEmployee(empId: string, month?: string): Promise<Payroll[]> {
    if (month)
      return await this.db
        .select()
        .from(payrollTable)
        .where(and(eq(payrollTable.emp_id, empId), eq(payrollTable.month, month)));
    return await this.db.select().from(payrollTable).where(eq(payrollTable.emp_id, empId));
  }

  async createPayroll(data: InsertPayroll): Promise<Payroll> {
    const rows = await this.db.insert(payrollTable).values(data).returning();
    return rows[0];
  }

  async bulkCreatePayroll(payrolls: InsertPayroll[]): Promise<Payroll[]> {
    if (payrolls.length === 0) return [];
    const rows = await this.db.insert(payrollTable).values(payrolls).returning();
    return rows;
  }

  async updatePayroll(empId: string, month: string, updates: Partial<InsertPayroll>): Promise<Payroll | undefined> {
    const rows = await this.db
      .update(payrollTable)
      .set(updates)
      .where(and(eq(payrollTable.emp_id, empId), eq(payrollTable.month, month)))
      .returning();
    return rows[0];
  }

  async deletePayroll(month: string): Promise<void> {
    await this.db.delete(payrollTable).where(eq(payrollTable.month, month));
  }

  async getLeaves(status?: string): Promise<Leave[]> {
    if (status) return await this.db.select().from(leavesTable).where(eq(leavesTable.status, status));
    return await this.db.select().from(leavesTable);
  }

  async getLeavesByEmployee(empId: string): Promise<Leave[]> {
    return await this.db.select().from(leavesTable).where(eq(leavesTable.emp_id, empId));
  }

  async getLeave(id: number): Promise<Leave | undefined> {
    const rows = await this.db.select().from(leavesTable).where(eq(leavesTable.id, id)).limit(1);
    return rows[0];
  }

  async createLeave(data: InsertLeave): Promise<Leave> {
    const rows = await this.db.insert(leavesTable).values(data).returning();
    return rows[0];
  }

  async updateLeave(id: number, updates: Partial<Leave>): Promise<Leave | undefined> {
    const rows = await this.db.update(leavesTable).set(updates).where(eq(leavesTable.id, id)).returning();
    return rows[0];
  }

  async getIndemnity(): Promise<Indemnity[]> {
    return await this.db.select().from(indemnityTable);
  }

  async getIndemnityByEmployee(empId: string): Promise<Indemnity | undefined> {
    const rows = await this.db.select().from(indemnityTable).where(eq(indemnityTable.emp_id, empId)).limit(1);
    return rows[0];
  }

  async createIndemnity(data: InsertIndemnity): Promise<Indemnity> {
    const rows = await this.db.insert(indemnityTable).values(data).returning();
    return rows[0];
  }

  async updateIndemnity(empId: string, updates: Partial<InsertIndemnity>): Promise<Indemnity | undefined> {
    const rows = await this.db.update(indemnityTable).set(updates).where(eq(indemnityTable.emp_id, empId)).returning();
    return rows[0];
  }
}
