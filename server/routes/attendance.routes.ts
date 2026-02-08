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
 * Get all attendance records, optionally filtered by month and/or dept_id
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const deptId = req.query.dept_id != null ? parseInt(String(req.query.dept_id), 10) : undefined;
    const attendance = await storage.getAttendance(month, isNaN(deptId!) ? undefined : deptId);
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
 * Bulk create attendance records.
 * Body: array of attendance records, OR { dept_id, month, attendances } to upload by department.
 * When dept_id is provided: only employees in that dept are allowed; existing attendance for that month for those employees is replaced.
 * When additive is true: only add records for (emp_id, month) that don't already exist; skip duplicates.
 */
router.post("/bulk", async (req, res) => {
  try {
    let attendances: z.infer<typeof insertAttendanceSchema>[];
    const body = req.body;
    const additive = Boolean(body?.additive);

    if (Array.isArray(body)) {
      attendances = z.array(insertAttendanceSchema).parse(body);
    } else if (body && body.attendances && body.month && body.dept_id != null) {
      const deptId = parseInt(String(body.dept_id), 10);
      const month = String(body.month);
      if (isNaN(deptId)) {
        return res.status(400).json({ error: "Invalid dept_id" });
      }
      attendances = z.array(insertAttendanceSchema).parse(body.attendances);
      // All records must be for the same month
      const badMonth = attendances.find((a) => a.month !== month);
      if (badMonth) {
        return res.status(400).json({ error: "All attendance records must have month equal to " + month });
      }
      // Replace only this department's slice (requires attendance.dept_id column). If DB has no dept_id column yet, fall back to replace-by-emp-ids.
      const useDeptSlice = await (async (): Promise<boolean> => {
        if (additive) return false;
        try {
          await storage.deleteAttendanceByMonthAndDept(month, deptId);
          return true;
        } catch (e: unknown) {
          const msg = e && typeof e === "object" && "code" in e ? String((e as { code?: string }).code) : "";
          const hasMsg = e && typeof e === "object" && "message" in e ? String((e as { message?: string }).message) : "";
          if (msg === "42703" || /dept_id|does not exist/.test(hasMsg)) {
            const empIds = [...new Set(attendances.map((a) => a.emp_id))];
            await storage.deleteAttendanceByMonthAndEmpIds(month, empIds);
            return false;
          }
          throw e;
        }
      })();
      if (useDeptSlice) {
        attendances = attendances.map((a) => ({ ...a, dept_id: deptId }));
      } else {
        attendances = attendances.map(({ dept_id: _d, ...rest }) => rest as z.infer<typeof insertAttendanceSchema>);
      }
    } else if (body && typeof body === "object" && body.attendances && body.month) {
      // Object format without dept: { attendances, month } or { attendances, month, additive: true }
      attendances = z.array(insertAttendanceSchema).parse(body.attendances);
      const month = String(body.month);
      const badMonth = attendances.find((a) => a.month !== month);
      if (badMonth) {
        return res.status(400).json({ error: "All attendance records must have month equal to " + month });
      }
    } else {
      return res.status(400).json({ error: "Body must be an array of attendance records or { dept_id?, month, attendances, additive? }" });
    }

    // When additive: filter out records for (emp_id, month) that already exist
    if (additive && attendances.length > 0) {
      const monthsInPayload = [...new Set(attendances.map((a) => a.month))];
      const existing = await Promise.all(monthsInPayload.map((m) => storage.getAttendance(m)));
      const existingKeySet = new Set<string>();
      for (const list of existing) {
        for (const att of list) {
          existingKeySet.add(`${att.emp_id}:${att.month}`);
        }
      }
      const beforeCount = attendances.length;
      attendances = attendances.filter((a) => !existingKeySet.has(`${a.emp_id}:${a.month}`));
      if (attendances.length < beforeCount && process.env.NODE_ENV !== "test") {
        console.log(`Additive upload: skipped ${beforeCount - attendances.length} existing (emp_id, month), inserting ${attendances.length}`);
      }
    }

    // Skip rows with unknown employee IDs (allow upload to succeed for valid rows)
    const employees = await storage.getEmployees();
    const validEmpIds = new Set(employees.map((e) => e.emp_id));
    const skippedIds = [...new Set(attendances.filter((a) => !validEmpIds.has(a.emp_id)).map((r) => r.emp_id))];
    attendances = attendances.filter((a) => validEmpIds.has(a.emp_id));

    const created = attendances.length > 0 ? await storage.bulkCreateAttendance(attendances) : [];
    if (skippedIds.length > 0) {
      res.json({
        created,
        skippedUnknownEmpIds: skippedIds,
        message: `Uploaded ${created.length} record(s). Skipped ${skippedIds.length} row(s) with unknown employee ID: ${skippedIds.join(", ")}`,
      });
    } else {
      res.json(created);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Attendance bulk upload error:", error);
    const resBody: any = { error: "Failed to upload attendance" };
    if (process.env.NODE_ENV === "development") {
      resBody.details = (error instanceof Error && error.message) ? error.message : String(error);
    }
    res.status(500).json(resBody);
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
