/**
 * Food Money Routes
 * Handles worksheet-based food allowance for employees who receive food money separately
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";

const router = Router();

const foodMoneyRecordSchema = z.object({
  emp_id: z.string(),
  month: z.string().regex(/^\d{2}-\d{4}$/, "Month must be MM-YYYY format"),
  amount: z.number().min(0),
});

const bulkUploadSchema = z.object({
  records: z.array(foodMoneyRecordSchema),
  replaceMonths: z.array(z.string()).optional(), // If provided, delete existing data for these months before insert
});

/**
 * GET /api/food-money
 * Get food money records, optionally filtered by month
 */
router.get("/", async (req, res) => {
  try {
    const month = req.query.month as string | undefined;
    const records = await storage.getFoodMoney(month);
    res.json(records);
  } catch (error) {
    console.error("/api/food-money error:", error);
    res.status(500).json({ error: "Failed to fetch food money records" });
  }
});

/**
 * POST /api/food-money/bulk
 * Bulk upload food money records from worksheet
 */
router.post("/bulk", async (req, res) => {
  try {
    const parsed = bulkUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten(), message: "Invalid payload" });
    }

    const { records, replaceMonths } = parsed.data;

    if (records.length === 0) {
      return res.status(400).json({ error: "No records to upload" });
    }

    const monthsToReplace = new Set(replaceMonths ?? []);
    const monthsInPayload = new Set(records.map((r) => r.month));

    for (const m of monthsInPayload) {
      if (monthsToReplace.has(m)) {
        await storage.deleteFoodMoneyForMonth(m);
      }
    }

    const toInsert = records.map((r) => ({
      emp_id: r.emp_id,
      month: r.month,
      amount: r.amount.toFixed(2),
    }));

    const created = await storage.bulkCreateFoodMoney(toInsert);

    res.json({
      count: created.length,
      message: `Uploaded ${created.length} food money record(s)`,
      months: [...monthsInPayload],
    });
  } catch (error) {
    console.error("Food money bulk upload error:", error);
    res.status(500).json({
      error: "Failed to upload food money records",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
