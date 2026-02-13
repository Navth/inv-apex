import { useState, useEffect } from "react";
import EmployeeTable from "@/components/EmployeeTable";
import EmployeeForm from "@/components/EmployeeForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, CalendarIcon, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { parseEmployeeFile } from "@/lib/employeeParser";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";
import { employeesApi } from "@/api/employees";
import { salaryHistoryApi } from "@/api/salaryHistory";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

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
  accommodation?: string;
}

export default function Employees() {
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeRow | null>(null);
  const [incrementEmployee, setIncrementEmployee] = useState<EmployeeRow | null>(null);
  const [incrementDate, setIncrementDate] = useState<Date | undefined>(undefined);
  const [incrementForm, setIncrementForm] = useState({
    basic_salary: "",
    other_allowance: "",
    food_allowance_amount: "",
    food_allowance_type: "none" as "none" | "daily" | "monthly",
    working_hours: 8,
    ot_rate_normal: "",
    ot_rate_friday: "",
    ot_rate_holiday: "",
    notes: "",
  });
  const [incrementSubmitting, setIncrementSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [parsedEmployees, setParsedEmployees] = useState<Array<{ emp_id: string; name: string; designation: string; department: string }>>([]);
  const [uploadPayload, setUploadPayload] = useState<Array<Record<string, unknown>>>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

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
        accommodation: e.accommodation ?? "Own",
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

  const handleIncrementClick = (employee: EmployeeRow) => {
    setIncrementEmployee(employee);
    setIncrementDate(undefined);
    setIncrementForm({
      basic_salary: String(employee.basic_salary),
      other_allowance: String(employee.other_allowance),
      food_allowance_amount: String(employee.food_allowance_amount ?? 0),
      food_allowance_type: employee.food_allowance_type || "none",
      working_hours: employee.working_hours ?? 8,
      ot_rate_normal: String(employee.ot_rate_normal ?? 0),
      ot_rate_friday: String(employee.ot_rate_friday ?? 0),
      ot_rate_holiday: String(employee.ot_rate_holiday ?? 0),
      notes: "",
    });
  };

  const handleIncrementSubmit = async () => {
    if (!incrementEmployee || !incrementDate) {
      alert("Please pick the date from when the new salary applies.");
      return;
    }
    const mm = String(incrementDate.getMonth() + 1).padStart(2, "0");
    const yyyy = incrementDate.getFullYear();
    const effective_month = `${mm}-${yyyy}`;
    const effective_from_day = incrementDate.getDate();

    setIncrementSubmitting(true);
    try {
      await employeesApi.update(incrementEmployee.emp_id, {
        basic_salary: incrementForm.basic_salary,
        other_allowance: incrementForm.other_allowance,
        food_allowance_amount: incrementForm.food_allowance_amount,
        food_allowance_type: incrementForm.food_allowance_type,
        working_hours: incrementForm.working_hours,
        ot_rate_normal: incrementForm.ot_rate_normal,
        ot_rate_friday: incrementForm.ot_rate_friday,
        ot_rate_holiday: incrementForm.ot_rate_holiday,
      });
      await salaryHistoryApi.create({
        emp_id: incrementEmployee.emp_id,
        effective_month,
        effective_from_day,
        basic_salary: incrementForm.basic_salary,
        other_allowance: incrementForm.other_allowance,
        food_allowance_amount: incrementForm.food_allowance_amount,
        food_allowance_type: incrementForm.food_allowance_type,
        working_hours: incrementForm.working_hours,
        ot_rate_normal: incrementForm.ot_rate_normal,
        ot_rate_friday: incrementForm.ot_rate_friday,
        ot_rate_holiday: incrementForm.ot_rate_holiday,
        category: incrementEmployee.category || "Direct",
        accommodation: incrementEmployee.accommodation || "Own",
        source: "system",
        notes: incrementForm.notes ? `Increment: ${incrementForm.notes}` : "Recorded from Employee page",
      });
      alert("Increment recorded. Employee salary updated and salary history saved.");
      setIncrementEmployee(null);
      await loadEmployees();
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? "Failed to record increment";
      alert(msg);
    } finally {
      setIncrementSubmitting(false);
    }
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

      {/* Bulk upload from CSV/Excel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload from CSV / Excel
          </CardTitle>
          <CardDescription>
            Add many employees at once. Required columns: Employee ID, Name, Designation, Department, DOJ (date of joining), Basic Salary. Optional: Category, Civil ID, Other Allowance, Food Allowance, Working Hours, Indemnity Rate. Header names can vary (e.g. Emp ID, emp_id, DOJ, Basic Salary).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="max-w-xs"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setUploadFile(file);
                setUploadErrors([]);
                setParsedEmployees([]);
                setUploadPayload([]);
                try {
                  const { records, errors } = await parseEmployeeFile(file);
                  setUploadErrors(errors);
                  setParsedEmployees(records.map((r) => ({ emp_id: r.emp_id, name: r.name, designation: r.designation, department: r.department })));
                  setUploadPayload(records as Array<Record<string, unknown>>);
                } catch (err) {
                  setUploadErrors([(err as Error).message]);
                }
              }}
            />
            {uploadFile && <span className="text-sm text-muted-foreground">{uploadFile.name}</span>}
          </div>
          {uploadErrors.length > 0 && (
            <div className="rounded-md bg-destructive/10 text-destructive text-sm p-2">
              {uploadErrors.slice(0, 8).map((msg, i) => <div key={i}>{msg}</div>)}
              {uploadErrors.length > 8 && <div>... and {uploadErrors.length - 8} more</div>}
            </div>
          )}
          {parsedEmployees.length > 0 && (
            <>
              <p className="text-sm font-medium">{parsedEmployees.length} employee(s) ready to add.</p>
              <Button
                disabled={uploading}
                onClick={async () => {
                  if (!uploadPayload.length) return;
                  setUploading(true);
                  try {
                    const res = await employeesApi.bulkCreate(uploadPayload as any);
                    alert(`Added ${res.count} employee(s) successfully.`);
                    setUploadFile(null);
                    setParsedEmployees([]);
                    setUploadPayload([]);
                    setUploadErrors([]);
                    loadEmployees();
                  } catch (err) {
                    alert((err as Error).message || "Failed to add employees.");
                  } finally {
                    setUploading(false);
                  }
                }}
              >
                {uploading ? "Adding..." : `Add ${parsedEmployees.length} employee(s)`}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <EmployeeTable
        employees={employees}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onIncrement={handleIncrementClick}
      />

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
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => {
              setIsDialogOpen(false);
              setEditingEmployee(null);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Record salary increment dialog */}
      <Dialog open={!!incrementEmployee} onOpenChange={(open) => !open && setIncrementEmployee(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Record salary increment
            </DialogTitle>
            <DialogDescription>
              {incrementEmployee && (
                <>Update salary for <strong>{incrementEmployee.name}</strong> and save it in history from the date you choose.</>
              )}
            </DialogDescription>
          </DialogHeader>
          {incrementEmployee && (
            <div className="space-y-4 py-2">
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <p className="font-medium text-sm">From which date does the new salary apply?</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !incrementDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {incrementDate ? format(incrementDate, "EEEE, d MMMM yyyy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <DayPickerCalendar
                      mode="single"
                      selected={incrementDate}
                      onSelect={setIncrementDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Basic salary (KWD) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={incrementForm.basic_salary}
                    onChange={(e) =>
                      setIncrementForm((f) => ({ ...f, basic_salary: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Other allowance (KWD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={incrementForm.other_allowance}
                    onChange={(e) =>
                      setIncrementForm((f) => ({ ...f, other_allowance: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Food allowance (KWD)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={incrementForm.food_allowance_amount}
                    onChange={(e) =>
                      setIncrementForm((f) => ({ ...f, food_allowance_amount: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Working hours / day</Label>
                  <Input
                    type="number"
                    value={incrementForm.working_hours}
                    onChange={(e) =>
                      setIncrementForm((f) => ({
                        ...f,
                        working_hours: parseInt(e.target.value, 10) || 8,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Textarea
                  placeholder="e.g. Annual increment, promotion..."
                  value={incrementForm.notes}
                  onChange={(e) =>
                    setIncrementForm((f) => ({ ...f, notes: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncrementEmployee(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleIncrementSubmit}
              disabled={incrementSubmitting || !incrementDate}
            >
              {incrementSubmitting ? "Saving..." : "Record increment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
