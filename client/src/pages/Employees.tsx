import { useState, useEffect } from "react";
import EmployeeTable from "@/components/EmployeeTable";
import EmployeeForm from "@/components/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { employeesApi } from "@/api/employees";

type AllowanceType = "per_day" | "fixed" | "none";

interface EmployeeRow {
  emp_id: string;
  name: string;
  designation: string;
  department: string;
  dept_id: number;
  category: string;
  civil_id?: string | null;
  doj: string;
  internal_department_doj?: string | null;
  five_year_calc_date?: string | null;
  basic_salary: number;
  other_allowance: number;
  food_allowance_type: AllowanceType;
  food_allowance_amount: number;
  working_hours: number;
  indemnity_rate: number;
  status: string;
  ot_rate_normal?: number;
  ot_rate_friday?: number;
  ot_rate_holiday?: number;
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);

  async function loadEmployees() {
    try {
      const data = await employeesApi.getAll();
      
      const mapped: EmployeeRow[] = (data || []).map((e: any) => ({
        emp_id: e.emp_id,
        name: e.name,
        designation: e.designation,
        department: e.department_name ?? e.department ?? "General",
        dept_id: e.dept_id ?? 0,
        category: e.category || "Direct",
        civil_id: e.civil_id || null,
        doj: e.doj,
        internal_department_doj: e.internal_department_doj || null,
        five_year_calc_date: e.five_year_calc_date || null,
        basic_salary: Number(e.basic_salary) || 0,
        other_allowance: Number(e.other_allowance) || 0,
        food_allowance_type: (e.food_allowance_type as AllowanceType) || "none",
        food_allowance_amount: Number(e.food_allowance_amount) || 0,
        working_hours: Number(e.working_hours) || 8,
        indemnity_rate: Number(e.indemnity_rate) || 0,
        status: e.status || "active",
        ot_rate_normal: Number(e.ot_rate_normal) || 0,
        ot_rate_friday: Number(e.ot_rate_friday) || 0,
        ot_rate_holiday: Number(e.ot_rate_holiday) || 0,
      }));
      setEmployees(mapped);
    } catch (err) {
      alert("Failed to load employees");
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  const handleEdit = (employee: EmployeeRow) => {
    setEditingEmployee(employee);
    setIsDialogOpen(true);
  };

  const handleDelete = async (empId: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this employee?");
    if (!confirmed) return;

    try {
      await employeesApi.delete(empId);
      alert("Employee deleted successfully");
      await loadEmployees();
    } catch (err) {
      alert("Delete failed");
    }
  };

  const handleSubmit = async (data: any) => {
    const deptId = Number(data.dept_id);
    if (!editingEmployee && (!deptId || deptId < 1)) {
      alert("Please select a department.");
      return;
    }

    const payload = {
      emp_id: String(data.emp_id).trim(),
      name: String(data.name).trim(),
      designation: String(data.designation).trim(),
      dept_id: deptId,
      category: data.category || "Direct",
      civil_id: data.civil_id?.trim() || null,
      doj: data.doj,
      internal_department_doj: data.internal_department_doj || null,
      five_year_calc_date: data.five_year_calc_date || null,
      basic_salary: String(Number(data.basic_salary) || 0),
      other_allowance: String(Number(data.other_allowance) || 0),
      food_allowance_type: data.food_allowance_type || "none",
      food_allowance_amount: String(data.food_allowance_type === "none" ? 0 : Number(data.food_allowance_value) || 0),
      working_hours: Number(data.working_hours) || 8,
      indemnity_rate: String(Number(data.indemnity_rate) || 0),
      ot_rate_normal: String(Number(data.ot_rate_normal) || 0),
      ot_rate_friday: String(Number(data.ot_rate_friday) || 0),
      ot_rate_holiday: String(Number(data.ot_rate_holiday) || 0),
      status: data.status || editingEmployee?.status || "active",
      accommodation: "Own",
    };

    try {
      if (editingEmployee) {
        await employeesApi.update(editingEmployee.emp_id, payload);
        alert("Employee updated successfully");
      } else {
        await employeesApi.create(payload as any);
        alert("Employee created successfully");
      }
      await loadEmployees();
      setIsDialogOpen(false);
      setEditingEmployee(null);
    } catch (err: any) {
      let msg = err?.message ?? "Save failed";
      if (Array.isArray(err?.details)) {
        msg = err.details.map((e: any) => e?.message ?? JSON.stringify(e)).join("; ");
      } else if (Array.isArray(err?.message)) {
        msg = err.message.map((e: any) => e?.message ?? e).join("; ");
      }
      alert(msg);
    }
  };

  // ✅ FIXED: Proper null handling for initialData
  const initialData = editingEmployee ? {
    emp_id: editingEmployee.emp_id,
    name: editingEmployee.name,
    designation: editingEmployee.designation,
    dept_id: editingEmployee.dept_id,
    category: editingEmployee.category,
    civil_id: editingEmployee.civil_id || "",
    doj: editingEmployee.doj,
    internal_department_doj: editingEmployee.internal_department_doj || "",
    five_year_calc_date: editingEmployee.five_year_calc_date || "",
    basic_salary: String(editingEmployee.basic_salary),
    other_allowance: String(editingEmployee.other_allowance),
    food_allowance_type: editingEmployee.food_allowance_type,
    food_allowance_value: editingEmployee.food_allowance_type === "none" ? "" : String(editingEmployee.food_allowance_amount),
    working_hours: String(editingEmployee.working_hours),
    indemnity_rate: String(editingEmployee.indemnity_rate),
    ot_rate_normal: String(editingEmployee.ot_rate_normal || 0),
    ot_rate_friday: String(editingEmployee.ot_rate_friday || 0),
    ot_rate_holiday: String(editingEmployee.ot_rate_holiday || 0),
    status: editingEmployee.status,
  } : undefined;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Employee Management</h1>
          <p className="text-muted-foreground">
            Manage your employee records and information
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingEmployee(null);
            setIsDialogOpen(true);
          }}
          data-testid="button-add-employee"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Employee
        </Button>
      </div>

      <EmployeeTable employees={employees} onEdit={handleEdit} onDelete={handleDelete} />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEmployee ? "Edit Employee" : "Add New Employee"}
            </DialogTitle>
            <DialogDescription id="add-employee-desc">
              {editingEmployee ? "Update employee details below." : "Fill in the form and select a department. All fields marked with * are required."}
            </DialogDescription>
          </DialogHeader>
          <EmployeeForm
            initialData={initialData} // ✅ FIXED: Now properly typed as Partial<EmployeeFormData> | undefined
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingEmployee(null);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
