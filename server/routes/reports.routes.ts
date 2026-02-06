/**
 * Reports Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { generateMonthlyReport } from "../services/reports.service";

const router = Router();

/**
 * GET /api/reports
 * Generate monthly report combining employee, attendance, and payroll data
 */
router.get("/", async (req, res) => {
  try {
    const month = (req.query.month as string | undefined) || "";
    
    if (!month) {
      return res.status(400).json({ error: "month query param (MM-YYYY) is required" });
    }

    const [employees, monthAttendance, monthPayroll] = await Promise.all([
      storage.getEmployeesWithDeptName(),
      storage.getAttendance(month),
      storage.getPayroll(month),
    ]);

    const rows = generateMonthlyReport(employees, monthAttendance, monthPayroll, month);
    
    res.json(rows);
  } catch (error) {
    console.error("/api/reports error:", error);
    res.status(500).json({ error: "Failed to build report" });
  }
});

export default router;
