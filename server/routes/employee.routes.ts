/**
 * Employee Routes
 */

import { Router } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertEmployeeSchema } from "@shared/schema";

const router = Router();

/**
 * GET /api/employees
 * Get all employees (with department_name for display)
 */
router.get("/", async (req, res) => {
  try {
    const employees = await storage.getEmployeesWithDeptName();
    res.json(employees);
  } catch (error) {
    console.error("/api/employees error:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

/**
 * GET /api/employees/:empId
 * Get single employee by ID (with department_name)
 */
router.get("/:empId", async (req, res) => {
  try {
    const employee = await storage.getEmployee(req.params.empId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const dept = await storage.getDept(employee.dept_id);
    res.json({ ...employee, department_name: dept?.name ?? "" });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch employee" });
  }
});

/**
 * POST /api/employees
 * Create a new employee
 */
router.post("/", async (req, res) => {
  try {
    const body = req.body;
    const deptId = body.dept_id != null ? parseInt(String(body.dept_id), 10) : NaN;
    if (!Number.isInteger(deptId) || deptId < 1) {
      return res.status(400).json({ error: "Valid department (dept_id) is required", details: [{ path: ["dept_id"], message: "Select a department" }] });
    }
    const existingDept = await storage.getDept(deptId);
    if (!existingDept) {
      return res.status(400).json({ error: "Invalid department", details: [{ path: ["dept_id"], message: "Department not found" }] });
    }
    const data = insertEmployeeSchema.parse(body);
    const employee = await storage.createEmployee(data);
    res.json(employee);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create employee" });
  }
});

/**
 * POST /api/employees/bulk
 * Bulk create employees (raw.department = department name; resolved to dept_id)
 */
router.post("/bulk", async (req, res) => {
  try {
    const { employees: employeesRaw } = req.body;
    if (!Array.isArray(employeesRaw) || employeesRaw.length === 0) {
      return res.status(400).json({ error: "employees array is required" });
    }

    const depts = await storage.getDepts();
    const deptByName = new Map(depts.map((d) => [d.name, d.id]));
    const defaultDeptId = deptByName.get("General") ?? depts[0]?.id;
    if (defaultDeptId == null) {
      return res.status(400).json({ error: "No departments found. Create at least one department first." });
    }

    const created: any[] = [];

    for (let index = 0; index < employeesRaw.length; index++) {
      const raw = employeesRaw[index];
      try {
        const deptId = raw.dept_id ?? deptByName.get(String(raw.department).trim()) ?? defaultDeptId;
        const payload = {
          emp_id: String(raw.emp_id),
          name: raw.name,
          civil_id: raw.civil_id || null,
          designation: raw.designation,
          dept_id: deptId,
          category: raw.category || "Direct",
          doj: raw.doj,
          internal_department_doj: raw.internal_department_doj || null,
          five_year_calc_date: null,
          basic_salary: String(raw.basic_salary ?? 0),
          other_allowance: String(raw.other_allowance ?? 0),
          ot_rate_normal: String(0),
          ot_rate_friday: String(0),
          ot_rate_holiday: String(0),
          food_allowance_type: raw.food_allowance > 0 ? "fixed" : "none",
          food_allowance_amount: String(raw.food_allowance ?? 0),
          working_hours: raw.working_hours ?? 8,
          indemnity_rate: String(raw.indemnity_rate ?? 15),
          status: "active",
        };

        const data = insertEmployeeSchema.parse(payload);
        const employee = await storage.createEmployee(data);
        created.push(employee);
      } catch (err) {
        console.error("Error on row", index, raw.emp_id, err);
        return res.status(400).json({ row: index, emp_id: raw.emp_id, error: String(err) });
      }
    }

    res.json({ count: created.length, created });
  } catch (err) {
    console.error("Bulk employees upload error (outer):", err);
    res.status(500).json({ error: "Failed to bulk create employees", details: String(err) });
  }
});

/**
 * PATCH /api/employees/:empId
 * Update an employee
 */
router.patch("/:empId", async (req, res) => {
  try {
    const employee = await storage.updateEmployee(req.params.empId, req.body);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Failed to update employee" });
  }
});

/**
 * DELETE /api/employees/:empId
 * Delete an employee
 */
router.delete("/:empId", async (req, res) => {
  try {
    const deleted = await storage.deleteEmployee(req.params.empId);
    if (!deleted) {
      return res.status(404).json({ error: "Employee not found" });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

export default router;
