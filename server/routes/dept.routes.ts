/**
 * Department Routes
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertDeptSchema } from "@shared/schema";

const router = Router();

/**
 * GET /api/dept
 * Get all departments
 */
router.get("/", async (req, res) => {
  try {
    const depts = await storage.getDepts();
    res.json(depts);
  } catch (error) {
    console.error("/api/dept error:", error);
    res.status(500).json({ error: "Failed to fetch departments" });
  }
});

/**
 * POST /api/dept
 * Create a new department
 */
router.post("/", async (req, res) => {
  try {
    const data = insertDeptSchema.parse(req.body);
    const dept = await storage.createDept(data);
    res.json(dept);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    console.error("Create dept error:", error);
    res.status(500).json({ error: "Failed to create department" });
  }
});

/**
 * PATCH /api/dept/:id
 * Update a department
 */
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid department ID" });
    const data = insertDeptSchema.partial().parse(req.body);
    const dept = await storage.updateDept(id, data);
    if (!dept) return res.status(404).json({ error: "Department not found" });
    res.json(dept);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    res.status(500).json({ error: "Failed to update department" });
  }
});

/**
 * DELETE /api/dept/:id
 * Delete a department (fails if employees reference it)
 */
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid department ID" });
    const deleted = await storage.deleteDept(id);
    if (!deleted) return res.status(404).json({ error: "Department not found or in use" });
    res.json({ success: true });
  } catch (error) {
    console.error("Delete dept error:", error);
    res.status(500).json({ error: "Failed to delete department" });
  }
});

export default router;
