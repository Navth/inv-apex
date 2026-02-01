import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Calendar,
  Users,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  X,
} from "lucide-react";
import type { Attendance, Employee } from "@shared/schema";
import { attendanceApi } from "@/api/attendance";
import { employeesApi } from "@/api/employees";

type AttendanceWithEmployee = Attendance & {
  employeeName?: string;
};

export default function AttendanceManagement() {
  const { toast } = useToast();
  
  // Date selectors
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  // State
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(currentMonth);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceWithEmployee[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AttendanceWithEmployee | null>(null);
  const [editForm, setEditForm] = useState({
    working_days: 0,
    present_days: 0,
    absent_days: 0,
    ot_hours_normal: "0",
    ot_hours_friday: "0",
    ot_hours_holiday: "0",
    round_off: "",
    dues_earned: "0",
    comments: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  // Delete dialog state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<AttendanceWithEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Computed month string
  const selectedMonth = `${String(selectedMonthNum).padStart(2, "0")}-${selectedYear}`;

  // Load employees on mount
  useEffect(() => {
    async function loadEmployees() {
      try {
        const data = await employeesApi.getAll();
        setEmployees(data || []);
      } catch (err) {
        console.error("Failed to load employees:", err);
      }
    }
    loadEmployees();
  }, []);

  // Load attendance data
  async function loadAttendance() {
    setIsLoading(true);
    try {
      const data = await attendanceApi.getAll(selectedMonth);
      
      // Enrich with employee names
      const employeeMap = new Map(employees.map(e => [e.emp_id, e.name]));
      const enriched: AttendanceWithEmployee[] = data.map(record => ({
        ...record,
        employeeName: employeeMap.get(record.emp_id) || "Unknown Employee",
      }));
      
      setAttendanceRecords(enriched);
    } catch (err) {
      console.error("Failed to load attendance:", err);
      toast({
        title: "Error",
        description: "Failed to load attendance records",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Load attendance when month changes or employees are loaded
  useEffect(() => {
    if (employees.length > 0) {
      loadAttendance();
    }
  }, [selectedMonth, employees]);

  // Filter records by search query
  const filteredRecords = useMemo(() => {
    if (!searchQuery.trim()) return attendanceRecords;
    
    const query = searchQuery.toLowerCase();
    return attendanceRecords.filter(record => 
      record.emp_id.toLowerCase().includes(query) ||
      record.employeeName?.toLowerCase().includes(query)
    );
  }, [attendanceRecords, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    const totalOTHours = filteredRecords.reduce((sum, r) => {
      return sum + Number(r.ot_hours_normal || 0) + Number(r.ot_hours_friday || 0) + Number(r.ot_hours_holiday || 0);
    }, 0);
    const avgPresentDays = total > 0 
      ? filteredRecords.reduce((sum, r) => sum + r.present_days, 0) / total 
      : 0;
    const withComments = filteredRecords.filter(r => r.comments && r.comments.trim()).length;
    
    return { total, totalOTHours, avgPresentDays, withComments };
  }, [filteredRecords]);

  // Handle edit
  function handleEdit(record: AttendanceWithEmployee) {
    setEditingRecord(record);
    setEditForm({
      working_days: record.working_days,
      present_days: record.present_days,
      absent_days: record.absent_days,
      ot_hours_normal: String(record.ot_hours_normal || "0"),
      ot_hours_friday: String(record.ot_hours_friday || "0"),
      ot_hours_holiday: String(record.ot_hours_holiday || "0"),
      round_off: record.round_off != null ? String(record.round_off) : "",
      dues_earned: String(record.dues_earned || "0"),
      comments: record.comments || "",
    });
    setIsEditDialogOpen(true);
  }

  async function handleSaveEdit() {
    if (!editingRecord) return;
    
    setIsSaving(true);
    try {
      const updates = {
        working_days: editForm.working_days,
        present_days: editForm.present_days,
        absent_days: editForm.absent_days,
        ot_hours_normal: editForm.ot_hours_normal,
        ot_hours_friday: editForm.ot_hours_friday,
        ot_hours_holiday: editForm.ot_hours_holiday,
        round_off: editForm.round_off || null,
        dues_earned: editForm.dues_earned,
        comments: editForm.comments,
      };
      
      await attendanceApi.update(editingRecord.id, updates);
      
      toast({
        title: "Success",
        description: "Attendance record updated successfully",
      });
      
      setIsEditDialogOpen(false);
      setEditingRecord(null);
      await loadAttendance();
    } catch (err) {
      console.error("Failed to update attendance:", err);
      toast({
        title: "Error",
        description: "Failed to update attendance record",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }

  // Handle delete
  function handleDelete(record: AttendanceWithEmployee) {
    setDeletingRecord(record);
    setIsDeleteDialogOpen(true);
  }

  async function confirmDelete() {
    if (!deletingRecord) return;
    
    setIsDeleting(true);
    try {
      await attendanceApi.delete(deletingRecord.id);
      
      toast({
        title: "Success",
        description: "Attendance record deleted successfully",
      });
      
      setIsDeleteDialogOpen(false);
      setDeletingRecord(null);
      await loadAttendance();
    } catch (err) {
      console.error("Failed to delete attendance:", err);
      toast({
        title: "Error",
        description: "Failed to delete attendance record",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // Update absent days when working/present days change
  function updateWorkingDays(value: number) {
    const absent = Math.max(value - editForm.present_days, 0);
    setEditForm(prev => ({ ...prev, working_days: value, absent_days: absent }));
  }

  function updatePresentDays(value: number) {
    const absent = Math.max(editForm.working_days - value, 0);
    setEditForm(prev => ({ ...prev, present_days: value, absent_days: absent }));
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold mb-2">Attendance Management</h1>
        <p className="text-muted-foreground">
          View, search, and edit attendance records from the database
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="year" className="text-sm font-medium mb-2 block">
                Year
              </Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(parseInt(val))}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="month" className="text-sm font-medium mb-2 block">
                Month
              </Label>
              <Select 
                value={selectedMonthNum.toString()} 
                onValueChange={(val) => setSelectedMonthNum(parseInt(val))}
              >
                <SelectTrigger id="month">
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, index) => (
                    <SelectItem key={index} value={(index + 1).toString()}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-[2] min-w-[300px]">
              <Label htmlFor="search" className="text-sm font-medium mb-2 block">
                Search
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by employee ID or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setSearchQuery("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              onClick={loadAttendance}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Records</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total OT Hours</p>
                <p className="text-2xl font-bold">{stats.totalOTHours.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg. Present Days</p>
                <p className="text-2xl font-bold">{stats.avgPresentDays.toFixed(1)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">With Comments</p>
                <p className="text-2xl font-bold">{stats.withComments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>
              Attendance Records - {monthNames[selectedMonthNum - 1]} {selectedYear}
            </span>
            <Badge variant="secondary">
              {filteredRecords.length} {filteredRecords.length === 1 ? "record" : "records"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Click on a record to view details. Use the edit button to modify.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Attendance Records</h3>
              <p className="text-muted-foreground">
                {searchQuery 
                  ? "No records match your search criteria."
                  : `No attendance records found for ${monthNames[selectedMonthNum - 1]} ${selectedYear}.`}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">Emp ID</TableHead>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold text-center">Working Days</TableHead>
                      <TableHead className="font-semibold text-center">Present</TableHead>
                      <TableHead className="font-semibold text-center">Absent</TableHead>
                      <TableHead className="font-semibold text-right">Normal OT</TableHead>
                      <TableHead className="font-semibold text-right">Friday OT</TableHead>
                      <TableHead className="font-semibold text-right">Holiday OT</TableHead>
                      <TableHead className="font-semibold text-right">Dues Earned</TableHead>
                      <TableHead className="font-semibold">Comments</TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow 
                        key={record.id}
                        className="hover:bg-muted/30 cursor-pointer"
                        onClick={() => handleEdit(record)}
                      >
                        <TableCell className="font-mono text-sm font-medium">
                          {record.emp_id}
                        </TableCell>
                        <TableCell>{record.employeeName}</TableCell>
                        <TableCell className="text-center">{record.working_days}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={record.present_days < record.working_days ? "secondary" : "default"}>
                            {record.present_days}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {record.absent_days > 0 ? (
                            <Badge variant="destructive">{record.absent_days}</Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(record.ot_hours_normal || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(record.ot_hours_friday || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(record.ot_hours_holiday || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {Number(record.dues_earned || 0).toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-muted-foreground">
                          {record.comments || "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(record);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(record);
                              }}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Edit Attendance Record
            </DialogTitle>
            <DialogDescription>
              {editingRecord && (
                <span>
                  Editing attendance for <strong>{editingRecord.employeeName}</strong> ({editingRecord.emp_id}) - {monthNames[selectedMonthNum - 1]} {selectedYear}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Days Section */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="working_days">Working Days</Label>
                <Input
                  id="working_days"
                  type="number"
                  min={0}
                  value={editForm.working_days}
                  onChange={(e) => updateWorkingDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="present_days">Present Days</Label>
                <Input
                  id="present_days"
                  type="number"
                  min={0}
                  max={editForm.working_days}
                  value={editForm.present_days}
                  onChange={(e) => updatePresentDays(Number(e.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="absent_days">Absent Days</Label>
                <Input
                  id="absent_days"
                  type="number"
                  value={editForm.absent_days}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Auto-calculated</p>
              </div>
            </div>

            {/* OT Hours Section */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Overtime Hours</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ot_normal" className="text-xs text-muted-foreground">Normal OT</Label>
                  <Input
                    id="ot_normal"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.ot_hours_normal}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ot_hours_normal: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ot_friday" className="text-xs text-muted-foreground">Friday OT</Label>
                  <Input
                    id="ot_friday"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.ot_hours_friday}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ot_hours_friday: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ot_holiday" className="text-xs text-muted-foreground">Holiday OT</Label>
                  <Input
                    id="ot_holiday"
                    type="number"
                    step="0.01"
                    min={0}
                    value={editForm.ot_hours_holiday}
                    onChange={(e) => setEditForm(prev => ({ ...prev, ot_hours_holiday: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Other Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="round_off">Round Off</Label>
                <Input
                  id="round_off"
                  type="number"
                  step="0.01"
                  placeholder="Optional"
                  value={editForm.round_off}
                  onChange={(e) => setEditForm(prev => ({ ...prev, round_off: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dues_earned">Dues Earned</Label>
                <Input
                  id="dues_earned"
                  type="number"
                  step="0.01"
                  min={0}
                  value={editForm.dues_earned}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dues_earned: e.target.value }))}
                />
              </div>
            </div>

            {/* Comments */}
            <div className="space-y-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                placeholder="Add any notes or comments..."
                value={editForm.comments}
                onChange={(e) => setEditForm(prev => ({ ...prev, comments: e.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={isSaving}>
              {isSaving ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attendance Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the attendance record for{" "}
              <strong>{deletingRecord?.employeeName}</strong> ({deletingRecord?.emp_id})?
              <br /><br />
              This action cannot be undone. The record for {monthNames[selectedMonthNum - 1]} {selectedYear} will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
