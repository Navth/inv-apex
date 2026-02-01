/**
 * Attendance Routes
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertAttendanceSchema } from "@shared/schema";

const router = Router();

/**
 * GET /api/attendance
 * Get all attendance records, optionally filtered by month
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const attendance = await storage.getAttendance(month);
    res.json(attendance);
  } catch (error) {
    console.error("/api/attendance error:", error);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

/**
 * GET /api/attendance/:empId
 * Get attendance for a specific employee
 */
router.get("/:empId", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const attendance = await storage.getAttendanceByEmployee(req.params.empId, month);
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
});

/**
 * POST /api/attendance
 * Create a single attendance record
 */
router.post("/", async (req, res) => {
  try {
    const data = insertAttendanceSchema.parse(req.body);
    const attendance = await storage.createAttendance(data);
    res.json(attendance);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create attendance" });
  }
});

/**
 * POST /api/attendance/bulk
 * Bulk create attendance records
 */
router.post("/bulk", async (req, res) => {
  try {
    const attendances = z.array(insertAttendanceSchema).parse(req.body);

    // Validate employee IDs
    const employees = await storage.getEmployees();
    const validEmpIds = new Set(employees.map(e => e.emp_id));
    
    const invalidEmpIds = attendances.filter(a => !validEmpIds.has(a.emp_id));

    if (invalidEmpIds.length > 0) {
      const invalidIds = invalidEmpIds.map(r => r.emp_id).join(", ");
      return res.status(400).json({
        error: "Invalid employee IDs in attendance upload",
        invalidIds,
        message: `The following employee IDs are invalid: ${invalidIds}`
      });
    }

    const created = await storage.bulkCreateAttendance(attendances);
    res.json(created);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    
    console.error("Attendance bulk upload error:", error);
    const body: any = { error: "Failed to upload attendance" };
    if (process.env.NODE_ENV === "development") {
      body.details = (error instanceof Error && error.message) ? error.message : String(error);
    }
    res.status(500).json(body);
  }
});

export default router;
