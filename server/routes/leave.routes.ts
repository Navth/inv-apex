/**
 * Leave Routes
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertLeaveSchema } from "@shared/schema";
import { LEAVE_STATUS } from "../config/constants";

const router = Router();

/**
 * GET /api/leaves
 * Get all leave requests, optionally filtered by status
 */
router.get("/", async (req, res) => {
  try {
    const status = req.query.status as string | undefined;
    const leaves = await storage.getLeaves(status);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
});

/**
 * GET /api/leaves/employee/:empId
 * Get leaves for a specific employee
 */
router.get("/employee/:empId", async (req, res) => {
  try {
    const leaves = await storage.getLeavesByEmployee(req.params.empId);
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leaves" });
  }
});

/**
 * GET /api/leaves/:id
 * Get a specific leave request by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const leave = await storage.getLeave(parseInt(req.params.id));
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leave" });
  }
});

/**
 * POST /api/leaves
 * Create a new leave request
 */
router.post("/", async (req, res) => {
  try {
    const data = insertLeaveSchema.parse(req.body);
    const leave = await storage.createLeave(data);
    res.json(leave);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to create leave request" });
  }
});

/**
 * PATCH /api/leaves/:id/approve
 * Approve a leave request
 */
router.patch("/:id/approve", async (req, res) => {
  try {
    const leave = await storage.updateLeave(parseInt(req.params.id), {
      status: LEAVE_STATUS.APPROVED,
      reviewed_at: new Date(),
      reviewed_by: "admin",
    });
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: "Failed to approve leave" });
  }
});

/**
 * PATCH /api/leaves/:id/reject
 * Reject a leave request
 */
router.patch("/:id/reject", async (req, res) => {
  try {
    const leave = await storage.updateLeave(parseInt(req.params.id), {
      status: LEAVE_STATUS.REJECTED,
      reviewed_at: new Date(),
      reviewed_by: "admin",
    });
    if (!leave) {
      return res.status(404).json({ error: "Leave request not found" });
    }
    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: "Failed to reject leave" });
  }
});

export default router;
