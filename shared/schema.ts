import { sql } from "drizzle-orm";
import { pgTable, text, varchar, serial, integer, decimal, timestamp, date, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const employees = pgTable("employees", {
  emp_id: varchar("emp_id", { length: 50 }).primaryKey(),
  name: text("name").notNull(),
  designation: text("designation").notNull(),
  civil_id: text("civil_id"),
  basic_salary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  food_allowance_amount: decimal("food_allowance_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  other_allowance: decimal("other_allowance", { precision: 10, scale: 2 }).notNull().default("0"),
  department: text("department").notNull(),
  doj: date("doj").notNull(),
  internal_department_doj: date("internal_department_doj"),
  five_year_calc_date: date("five_year_calc_date"),
  indemnity_rate: decimal("indemnity_rate", { precision: 10, scale: 2 }).notNull().default("0"),
  working_hours: integer("working_hours").notNull().default(8),
  category: text("category").notNull().default("Direct"),
  ot_rate_normal: decimal("ot_rate_normal", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_rate_friday: decimal("ot_rate_friday", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_rate_holiday: decimal("ot_rate_holiday", { precision: 10, scale: 2 }).notNull().default("0"),
  food_allowance_type: text("food_allowance_type").notNull().default("none"),
  status: text("status").notNull().default("active"),
  accommodation: text("accommodation").notNull().default("Own"), // Own, Company, Camp, Souq Sabha
});

export const insertEmployeeSchema = createInsertSchema(employees); // No omit needed now
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employees.$inferSelect;
export const attendance = pgTable("attendance", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  working_days: integer("working_days").notNull(),
  present_days: integer("present_days").notNull(),
  absent_days: integer("absent_days").notNull(),
  ot_hours_normal: decimal("ot_hours_normal", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_hours_friday: decimal("ot_hours_friday", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_hours_holiday: decimal("ot_hours_holiday", { precision: 10, scale: 2 }).notNull().default("0"),
  uploaded_at: timestamp("uploaded_at").notNull().defaultNow(),
  round_off: decimal("round_off", { precision: 10, scale: 2 }),
  comments: text("comments"),
  dues_earned: decimal("dues_earned", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertAttendanceSchema = createInsertSchema(attendance).omit({ id: true, uploaded_at: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendance.$inferSelect;

export const payroll = pgTable("payroll", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  basic_salary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  ot_amount: decimal("ot_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  food_allowance: decimal("food_allowance", { precision: 10, scale: 2 }).notNull().default("0"),
  gross_salary: decimal("gross_salary", { precision: 10, scale: 2 }).notNull(),
  deductions: decimal("deductions", { precision: 10, scale: 2 }).notNull().default("0"),
  net_salary: decimal("net_salary", { precision: 10, scale: 2 }).notNull(),
  generated_at: timestamp("generated_at").notNull().defaultNow(),
  days_worked: integer("days_worked").notNull().default(0),
  dues_earned: decimal("dues_earned", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertPayrollSchema = createInsertSchema(payroll).omit({ id: true, generated_at: true });
export type InsertPayroll = z.infer<typeof insertPayrollSchema>;
export type Payroll = typeof payroll.$inferSelect;

export const leaves = pgTable("leaves", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull(),
  leave_type: text("leave_type").notNull(),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  days: integer("days").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("Pending"),
  submitted_at: timestamp("submitted_at").notNull().defaultNow(),
  reviewed_at: timestamp("reviewed_at"),
  reviewed_by: varchar("reviewed_by", { length: 50 }),
});

export const insertLeaveSchema = createInsertSchema(leaves).omit({ id: true, submitted_at: true, reviewed_at: true, reviewed_by: true });
export type InsertLeave = z.infer<typeof insertLeaveSchema>;
export type Leave = typeof leaves.$inferSelect;


export const indemnity = pgTable("indemnity", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull().unique(),
  years_of_service: decimal("years_of_service", { precision: 10, scale: 2 }).notNull(),
  indemnity_amount: decimal("indemnity_amount", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("Active"),
  paid_at: timestamp("paid_at"),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const insertIndemnitySchema = createInsertSchema(indemnity).omit({ id: true, updated_at: true, paid_at: true });
export type InsertIndemnity = z.infer<typeof insertIndemnitySchema>;
export type Indemnity = typeof indemnity.$inferSelect;

// Employee Salary History - tracks salary changes over time for accurate historical reporting
export const employeeSalaryHistory = pgTable("employee_salary_history", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull(),
  basic_salary: decimal("basic_salary", { precision: 10, scale: 2 }).notNull(),
  other_allowance: decimal("other_allowance", { precision: 10, scale: 2 }).notNull().default("0"),
  food_allowance_amount: decimal("food_allowance_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  food_allowance_type: text("food_allowance_type").notNull().default("none"),
  working_hours: integer("working_hours").notNull().default(8),
  ot_rate_normal: decimal("ot_rate_normal", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_rate_friday: decimal("ot_rate_friday", { precision: 10, scale: 2 }).notNull().default("0"),
  ot_rate_holiday: decimal("ot_rate_holiday", { precision: 10, scale: 2 }).notNull().default("0"),
  effective_month: varchar("effective_month", { length: 7 }).notNull(), // MM-YYYY format
  created_at: timestamp("created_at").notNull().defaultNow(),
  notes: text("notes"), // Optional reason for change (e.g., "Annual increment", "Promotion")
});

export const insertEmployeeSalaryHistorySchema = createInsertSchema(employeeSalaryHistory).omit({ id: true, created_at: true });
export type InsertEmployeeSalaryHistory = z.infer<typeof insertEmployeeSalaryHistorySchema>;
export type EmployeeSalaryHistory = typeof employeeSalaryHistory.$inferSelect;

// Food Money - per-employee per-month amounts from separate worksheet (for employees who receive food money separately)
export const foodMoney = pgTable("food_money", {
  id: serial("id").primaryKey(),
  emp_id: varchar("emp_id", { length: 50 }).notNull(),
  month: varchar("month", { length: 7 }).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  uploaded_at: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertFoodMoneySchema = createInsertSchema(foodMoney).omit({ id: true, uploaded_at: true });
export type InsertFoodMoney = z.infer<typeof insertFoodMoneySchema>;
export type FoodMoney = typeof foodMoney.$inferSelect;
