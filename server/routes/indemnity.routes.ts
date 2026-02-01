/**
 * Indemnity Routes
 */

import { Router } from "express";
import { storage } from "../storage";
import { 
  calculateEmployeeIndemnity,
  generateIndemnityRecords 
} from "../services/indemnity.service";
import { INDEMNITY_STATUS } from "../config/constants";

const router = Router();

/**
 * GET /api/indemnity
 * Get all indemnity records
 */
router.get("/", async (req, res) => {
  try {
    const indemnity = await storage.getIndemnity();
    res.json(indemnity);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch indemnity" });
  }
});

/**
 * GET /api/indemnity/:empId
 * Get indemnity for a specific employee
 */
router.get("/:empId", async (req, res) => {
  try {
    const indemnity = await storage.getIndemnityByEmployee(req.params.empId);
    if (!indemnity) {
      return res.status(404).json({ error: "Indemnity record not found" });
    }
    res.json(indemnity);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch indemnity" });
  }
});

/**
 * POST /api/indemnity/calculate
 * Calculate and update indemnity for all employees
 */
router.post("/calculate", async (req, res) => {
  try {
    const employees = await storage.getEmployees();
    const indemnityRecords = [];
    
    for (const employee of employees) {
      const calculation = calculateEmployeeIndemnity(employee);
      
      const existing = await storage.getIndemnityByEmployee(employee.emp_id);
      
      if (existing) {
        // Update existing record
        await storage.updateIndemnity(employee.emp_id, {
          years_of_service: calculation.yearsOfService.toFixed(2),
          indemnity_amount: calculation.indemnityAmount.toFixed(2),
        });
      } else {
        // Create new record
        indemnityRecords.push({
          emp_id: employee.emp_id,
          years_of_service: calculation.yearsOfService.toFixed(2),
          indemnity_amount: calculation.indemnityAmount.toFixed(2),
          status: calculation.status,
        });
      }
    }
    
    // Create new indemnity records
    const created = await Promise.all(
      indemnityRecords.map(record => storage.createIndemnity(record))
    );
    
    res.json({ message: "Indemnity calculated successfully", created });
  } catch (error) {
    console.error("Indemnity calculation error:", error);
    res.status(500).json({ error: "Failed to calculate indemnity" });
  }
});

/**
 * PATCH /api/indemnity/:empId/pay
 * Mark indemnity as paid
 */
router.patch("/:empId/pay", async (req, res) => {
  try {
    const record = await storage.updateIndemnity(req.params.empId, {
      status: INDEMNITY_STATUS.PAID,
      indemnity_amount: req.body?.indemnity_amount, // optional override
    });
    if (!record) {
      return res.status(404).json({ error: "Indemnity record not found" });
    }
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: "Failed to mark indemnity paid" });
  }
});

export default router;
