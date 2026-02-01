/**
 * Route Registration
 * 
 * This module registers all route handlers with the Express application.
 */

import type { Express } from "express";
import { createServer, type Server } from "http";

import authRoutes from "./auth.routes";
import employeeRoutes from "./employee.routes";
import attendanceRoutes from "./attendance.routes";
import payrollRoutes from "./payroll.routes";
import leaveRoutes from "./leave.routes";
import indemnityRoutes from "./indemnity.routes";
import reportsRoutes from "./reports.routes";
import salaryHistoryRoutes from "./salary-history.routes";

/**
 * Register all API routes
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes (at root level for /api/login, /api/logout, /api/auth/check)
  app.use("/api", authRoutes);
  
  // Resource routes
  app.use("/api/employees", employeeRoutes);
  app.use("/api/attendance", attendanceRoutes);
  app.use("/api/payroll", payrollRoutes);
  app.use("/api/leaves", leaveRoutes);
  app.use("/api/indemnity", indemnityRoutes);
  app.use("/api/reports", reportsRoutes);
  app.use("/api/salary-history", salaryHistoryRoutes);

  const httpServer = createServer(app);

  return httpServer;
}
