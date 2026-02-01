import { Router } from "express";
import { storage } from "../storage";

const router = Router();

// Get salary history for an employee
router.get("/employee/:empId", async (req, res) => {
  try {
    const { empId } = req.params;
    const history = await storage.getSalaryHistory(empId);
    res.json(history);
  } catch (error) {
    console.error("Error fetching salary history:", error);
    res.status(500).json({ error: "Failed to fetch salary history" });
  }
});

// Get salary for a specific employee and month
router.get("/employee/:empId/month/:month", async (req, res) => {
  try {
    const { empId, month } = req.params;
    const salary = await storage.getSalaryForMonth(empId, month);
    if (!salary) {
      return res.status(404).json({ error: "No salary record found for this month" });
    }
    res.json(salary);
  } catch (error) {
    console.error("Error fetching salary for month:", error);
    res.status(500).json({ error: "Failed to fetch salary for month" });
  }
});

// Get all salary records for a specific month
router.get("/month/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const salaries = await storage.getAllSalariesForMonth(month);
    res.json(salaries);
  } catch (error) {
    console.error("Error fetching salaries for month:", error);
    res.status(500).json({ error: "Failed to fetch salaries for month" });
  }
});

// Create a new salary history record
router.post("/", async (req, res) => {
  try {
    const data = req.body;
    
    // Check if a record already exists for this employee and month
    const existing = await storage.getSalaryForMonth(data.emp_id, data.effective_month);
    if (existing) {
      return res.status(409).json({ 
        error: "Salary record already exists for this employee and month",
        existing 
      });
    }
    
    const history = await storage.createSalaryHistory(data);
    res.status(201).json(history);
  } catch (error) {
    console.error("Error creating salary history:", error);
    res.status(500).json({ error: "Failed to create salary history" });
  }
});

// Update a salary history record
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    
    const updated = await storage.updateSalaryHistory(id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Salary history record not found" });
    }
    
    res.json(updated);
  } catch (error) {
    console.error("Error updating salary history:", error);
    res.status(500).json({ error: "Failed to update salary history" });
  }
});

// Delete a salary history record
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const deleted = await storage.deleteSalaryHistory(id);
    
    if (!deleted) {
      return res.status(404).json({ error: "Salary history record not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting salary history:", error);
    res.status(500).json({ error: "Failed to delete salary history" });
  }
});

// Bulk create salary history records for a month (copy from current employee data)
router.post("/bulk-create/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const { overwrite } = req.query;
    
    // Get all employees
    const employees = await storage.getEmployees();
    
    // Get existing salary records for this month
    const existingSalaries = await storage.getAllSalariesForMonth(month);
    const existingEmpIds = new Set(existingSalaries.map(s => s.emp_id));
    
    const created: any[] = [];
    const skipped: string[] = [];
    
    for (const employee of employees) {
      // Skip if record exists and overwrite is not enabled
      if (existingEmpIds.has(employee.emp_id) && overwrite !== 'true') {
        skipped.push(employee.emp_id);
        continue;
      }
      
      // If overwrite, delete existing record first
      if (existingEmpIds.has(employee.emp_id) && overwrite === 'true') {
        const existing = existingSalaries.find(s => s.emp_id === employee.emp_id);
        if (existing) {
          await storage.deleteSalaryHistory(existing.id);
        }
      }
      
      const historyRecord = await storage.createSalaryHistory({
        emp_id: employee.emp_id,
        basic_salary: employee.basic_salary,
        other_allowance: employee.other_allowance || "0",
        food_allowance_amount: employee.food_allowance_amount || "0",
        food_allowance_type: employee.food_allowance_type || "none",
        working_hours: employee.working_hours || 8,
        ot_rate_normal: employee.ot_rate_normal || "0",
        ot_rate_friday: employee.ot_rate_friday || "0",
        ot_rate_holiday: employee.ot_rate_holiday || "0",
        effective_month: month,
        notes: `Snapshot from employee data`,
      });
      
      created.push(historyRecord);
    }
    
    res.status(201).json({
      message: `Created ${created.length} salary records, skipped ${skipped.length}`,
      created: created.length,
      skipped: skipped.length,
      skippedEmpIds: skipped,
    });
  } catch (error) {
    console.error("Error bulk creating salary history:", error);
    res.status(500).json({ error: "Failed to bulk create salary history" });
  }
});

export default router;
