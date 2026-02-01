import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { salaryHistoryApi, employeesApi, EmployeeSalaryHistory } from "@/api";
import {
  Search,
  Calendar,
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  Download,
  History,
  RefreshCw,
  Clock,
  FileText,
  AlertCircle,
} from "lucide-react";

interface Employee {
  emp_id: string;
  name: string;
  basic_salary: string;
  other_allowance: string;
  food_allowance_amount: string;
  food_allowance_type: string;
  working_hours: number;
  ot_rate_normal: string;
  ot_rate_friday: string;
  ot_rate_holiday: string;
}

interface FormData {
  emp_id: string;
  basic_salary: string;
  other_allowance: string;
  food_allowance_amount: string;
  food_allowance_type: string;
  working_hours: number;
  ot_rate_normal: string;
  ot_rate_friday: string;
  ot_rate_holiday: string;
  effective_month: string;
  notes: string;
}

const defaultFormData: FormData = {
  emp_id: "",
  basic_salary: "",
  other_allowance: "0",
  food_allowance_amount: "0",
  food_allowance_type: "none",
  working_hours: 8,
  ot_rate_normal: "0",
  ot_rate_friday: "0",
  ot_rate_holiday: "0",
  effective_month: "",
  notes: "",
};

export default function SalaryHistory() {
  const { toast } = useToast();

  // Month/Year selection
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(currentDate.getMonth() + 1).padStart(2, "0")
  );
  const [selectedYear, setSelectedYear] = useState(
    String(currentDate.getFullYear())
  );

  // Data
  const [salaryRecords, setSalaryRecords] = useState<EmployeeSalaryHistory[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkCreateDialogOpen, setBulkCreateDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<EmployeeSalaryHistory | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);

  const formattedMonth = `${selectedMonth}-${selectedYear}`;

  // Generate month options
  const months = [
    { value: "01", label: "January" },
    { value: "02", label: "February" },
    { value: "03", label: "March" },
    { value: "04", label: "April" },
    { value: "05", label: "May" },
    { value: "06", label: "June" },
    { value: "07", label: "July" },
    { value: "08", label: "August" },
    { value: "09", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" },
  ];

  // Generate year options (last 5 years)
  const years = Array.from({ length: 5 }, (_, i) => {
    const year = currentDate.getFullYear() - i;
    return { value: String(year), label: String(year) };
  });

  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [salaryData, employeeData] = await Promise.all([
        salaryHistoryApi.getAllForMonth(formattedMonth),
        employeesApi.getAll(),
      ]);
      setSalaryRecords(salaryData);
      setEmployees(employeeData);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to fetch salary history data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [formattedMonth]);

  // Get employee name by ID
  const getEmployeeName = (empId: string): string => {
    const emp = employees.find((e) => e.emp_id === empId);
    return emp?.name || empId;
  };

  // Filter records by search
  const filteredRecords = salaryRecords.filter((record) => {
    const empName = getEmployeeName(record.emp_id).toLowerCase();
    const empId = record.emp_id.toLowerCase();
    const search = searchTerm.toLowerCase();
    return empName.includes(search) || empId.includes(search);
  });

  // Open create dialog
  const handleCreate = () => {
    setFormData({
      ...defaultFormData,
      effective_month: formattedMonth,
    });
    setCreateDialogOpen(true);
  };

  // Open edit dialog
  const handleEdit = (record: EmployeeSalaryHistory) => {
    setSelectedRecord(record);
    setFormData({
      emp_id: record.emp_id,
      basic_salary: record.basic_salary,
      other_allowance: record.other_allowance || "0",
      food_allowance_amount: record.food_allowance_amount || "0",
      food_allowance_type: record.food_allowance_type || "none",
      working_hours: record.working_hours || 8,
      ot_rate_normal: record.ot_rate_normal || "0",
      ot_rate_friday: record.ot_rate_friday || "0",
      ot_rate_holiday: record.ot_rate_holiday || "0",
      effective_month: record.effective_month,
      notes: record.notes || "",
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const handleDelete = (record: EmployeeSalaryHistory) => {
    setSelectedRecord(record);
    setDeleteDialogOpen(true);
  };

  // Auto-fill from employee data
  const handleEmployeeSelect = (empId: string) => {
    const emp = employees.find((e) => e.emp_id === empId);
    if (emp) {
      setFormData({
        ...formData,
        emp_id: empId,
        basic_salary: emp.basic_salary,
        other_allowance: emp.other_allowance || "0",
        food_allowance_amount: emp.food_allowance_amount || "0",
        food_allowance_type: emp.food_allowance_type || "none",
        working_hours: emp.working_hours || 8,
        ot_rate_normal: emp.ot_rate_normal || "0",
        ot_rate_friday: emp.ot_rate_friday || "0",
        ot_rate_holiday: emp.ot_rate_holiday || "0",
      });
    }
  };

  // Submit create form
  const handleSubmitCreate = async () => {
    if (!formData.emp_id || !formData.basic_salary) {
      toast({
        title: "Validation Error",
        description: "Employee and Basic Salary are required",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      await salaryHistoryApi.create({
        emp_id: formData.emp_id,
        basic_salary: formData.basic_salary,
        other_allowance: formData.other_allowance,
        food_allowance_amount: formData.food_allowance_amount,
        food_allowance_type: formData.food_allowance_type,
        working_hours: formData.working_hours,
        ot_rate_normal: formData.ot_rate_normal,
        ot_rate_friday: formData.ot_rate_friday,
        ot_rate_holiday: formData.ot_rate_holiday,
        effective_month: formData.effective_month,
        notes: formData.notes || undefined,
      });
      toast({
        title: "Success",
        description: "Salary history record created successfully",
      });
      setCreateDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error creating salary history:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to create salary history record",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Submit edit form
  const handleSubmitEdit = async () => {
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      await salaryHistoryApi.update(selectedRecord.id, {
        basic_salary: formData.basic_salary,
        other_allowance: formData.other_allowance,
        food_allowance_amount: formData.food_allowance_amount,
        food_allowance_type: formData.food_allowance_type,
        working_hours: formData.working_hours,
        ot_rate_normal: formData.ot_rate_normal,
        ot_rate_friday: formData.ot_rate_friday,
        ot_rate_holiday: formData.ot_rate_holiday,
        notes: formData.notes || undefined,
      });
      toast({
        title: "Success",
        description: "Salary history record updated successfully",
      });
      setEditDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error updating salary history:", error);
      toast({
        title: "Error",
        description: "Failed to update salary history record",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm delete
  const handleConfirmDelete = async () => {
    if (!selectedRecord) return;

    setSubmitting(true);
    try {
      await salaryHistoryApi.delete(selectedRecord.id);
      toast({
        title: "Success",
        description: "Salary history record deleted successfully",
      });
      setDeleteDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error deleting salary history:", error);
      toast({
        title: "Error",
        description: "Failed to delete salary history record",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Bulk create from employee data
  const handleBulkCreate = async (overwrite: boolean) => {
    setSubmitting(true);
    try {
      const result = await salaryHistoryApi.bulkCreateFromEmployees(formattedMonth, overwrite);
      toast({
        title: "Success",
        description: result.message,
      });
      setBulkCreateDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error bulk creating salary history:", error);
      toast({
        title: "Error",
        description: "Failed to create salary history records",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Employees without salary history for this month
  const employeesWithoutHistory = employees.filter(
    (emp) => !salaryRecords.some((r) => r.emp_id === emp.emp_id)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Salary History</h1>
          <p className="text-muted-foreground mt-1">
            Manage historical salary snapshots for accurate payroll calculations
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Record
          </Button>
          <Button
            variant="outline"
            onClick={() => setBulkCreateDialogOpen(true)}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Snapshot All
          </Button>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
        <CardContent className="flex items-start gap-3 pt-4">
          <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Why Salary History?
            </p>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              When an employee's salary changes, historical payroll reports would show incorrect
              values if based on current salary. Salary history records preserve the actual salary
              at each point in time, ensuring accurate historical reporting and payroll regeneration.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2 flex-1">
              <div className="w-40">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger>
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year.value} value={year.value}>
                        {year.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchData} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <History className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{salaryRecords.length}</p>
                <p className="text-sm text-muted-foreground">Records for {formattedMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {salaryRecords
                    .reduce((sum, r) => sum + parseFloat(r.basic_salary || "0"), 0)
                    .toFixed(2)}{" "}
                  KWD
                </p>
                <p className="text-sm text-muted-foreground">Total Basic Salary</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <FileText className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{employeesWithoutHistory.length}</p>
                <p className="text-sm text-muted-foreground">Missing Records</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Salary Records - {formattedMonth}
          </CardTitle>
          <CardDescription>
            Historical salary data for payroll calculations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No salary history records found for {formattedMonth}</p>
              <p className="text-sm mt-2">
                Click "Snapshot All" to create records from current employee data
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Other Allowance</TableHead>
                    <TableHead className="text-right">Food Allowance</TableHead>
                    <TableHead className="text-center">Hours</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{getEmployeeName(record.emp_id)}</p>
                          <p className="text-xs text-muted-foreground">{record.emp_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(record.basic_salary).toFixed(2)} KWD
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(record.other_allowance || "0").toFixed(2)} KWD
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex flex-col items-end">
                          <span className="font-mono">
                            {parseFloat(record.food_allowance_amount || "0").toFixed(2)} KWD
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {record.food_allowance_type || "none"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {record.working_hours || 8}h
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground truncate max-w-[150px] block">
                          {record.notes || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(record)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(record)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Salary History Record</DialogTitle>
            <DialogDescription>
              Create a salary snapshot for {formattedMonth}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Employee *</Label>
              <Select
                value={formData.emp_id}
                onValueChange={handleEmployeeSelect}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.emp_id} value={emp.emp_id}>
                      {emp.name} ({emp.emp_id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (KWD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.basic_salary}
                  onChange={(e) =>
                    setFormData({ ...formData, basic_salary: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Other Allowance (KWD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.other_allowance}
                  onChange={(e) =>
                    setFormData({ ...formData, other_allowance: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Food Allowance (KWD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.food_allowance_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, food_allowance_amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Food Allowance Type</Label>
                <Select
                  value={formData.food_allowance_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, food_allowance_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Working Hours / Day</Label>
              <Input
                type="number"
                value={formData.working_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    working_hours: parseInt(e.target.value) || 8,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="e.g., Annual increment, Promotion, Initial record..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitCreate} disabled={submitting}>
              {submitting ? "Creating..." : "Create Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Salary History Record</DialogTitle>
            <DialogDescription>
              Update salary data for {selectedRecord && getEmployeeName(selectedRecord.emp_id)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Basic Salary (KWD) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.basic_salary}
                  onChange={(e) =>
                    setFormData({ ...formData, basic_salary: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Other Allowance (KWD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.other_allowance}
                  onChange={(e) =>
                    setFormData({ ...formData, other_allowance: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Food Allowance (KWD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.food_allowance_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, food_allowance_amount: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Food Allowance Type</Label>
                <Select
                  value={formData.food_allowance_type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, food_allowance_type: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Working Hours / Day</Label>
              <Input
                type="number"
                value={formData.working_hours}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    working_hours: parseInt(e.target.value) || 8,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="e.g., Annual increment, Promotion..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitEdit} disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Salary History Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the salary record for{" "}
              <strong>{selectedRecord && getEmployeeName(selectedRecord.emp_id)}</strong> for{" "}
              <strong>{selectedRecord?.effective_month}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={submitting}
            >
              {submitting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Create Dialog */}
      <AlertDialog open={bulkCreateDialogOpen} onOpenChange={setBulkCreateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create Salary Snapshot for {formattedMonth}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create salary history records for all employees using their current salary
              data. Existing records can be preserved or overwritten.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              variant="outline"
              onClick={() => handleBulkCreate(false)}
              disabled={submitting}
            >
              Keep Existing
            </Button>
            <Button onClick={() => handleBulkCreate(true)} disabled={submitting}>
              {submitting ? "Creating..." : "Overwrite All"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
