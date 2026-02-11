/**
 * Food Allowance (separate worksheet) Routes
 * Allows setting monthly food money per employee when it is given separately from the master sheet.
 */

import { Router } from "express";
import { storage } from "../storage";

const router = Router();

/**
 * GET /api/food-allowance?month=MM-YYYY
 * List food allowance amounts for a month (from the separate worksheet).
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    if (!month || !/^\d{2}-\d{4}$/.test(month)) {
      return res.status(400).json({ error: "Query param month (MM-YYYY) is required" });
    }
    const rows = await storage.getFoodAllowanceForMonth(month);
    res.json(rows);
  } catch (error) {
    console.error("GET /api/food-allowance error:", error);
    res.status(500).json({ error: "Failed to fetch food allowance" });
  }
});

/**
 * POST /api/food-allowance/bulk
 * Body: { month: "MM-YYYY", entries: [ { emp_id: string, amount: number }, ... ] }
 * Set food allowance for multiple employees for one month (e.g. from imported worksheet).
 */
router.post("/bulk", async (req, res) => {
  try {
    const { month, entries } = req.body as { month?: string; entries?: { emp_id: string; amount: number }[] };
    if (!month || !/^\d{2}-\d{4}$/.test(month)) {
      return res.status(400).json({ error: "Body must include month (MM-YYYY)" });
    }
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Body must include entries array with emp_id and amount" });
    }
    const valid = entries
      .filter((e: any) => e && typeof e.emp_id === "string" && typeof e.amount === "number")
      .map((e: any) => ({ emp_id: e.emp_id, month, amount: Number(e.amount) }));
    await storage.bulkSetFoodAllowance(valid);
    res.json({ message: `Set food allowance for ${valid.length} employee(s) for ${month}`, count: valid.length });
  } catch (error) {
    console.error("POST /api/food-allowance/bulk error:", error);
    res.status(500).json({ error: "Failed to set food allowance" });
  }
});

export default router;
