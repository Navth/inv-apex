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

/**
 * PATCH /api/attendance/:id
 * Update an attendance record by ID
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid attendance ID" });
    }

    const updates = insertAttendanceSchema.partial().parse(req.body);
    const updated = await storage.updateAttendance(id, updates);
    
    if (!updated) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    
    res.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Update attendance error:", error);
    res.status(500).json({ error: "Failed to update attendance" });
  }
});

/**
 * DELETE /api/attendance/:id
 * Delete an attendance record by ID
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid attendance ID" });
    }

    const deleted = await storage.deleteAttendance(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Attendance record not found" });
    }
    
    res.json({ success: true, message: "Attendance record deleted" });
  } catch (error) {
    console.error("Delete attendance error:", error);
    res.status(500).json({ error: "Failed to delete attendance" });
  }
});

export default router;
