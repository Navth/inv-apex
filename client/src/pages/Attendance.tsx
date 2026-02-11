import { useState, useEffect } from "react";
import AttendanceUpload from "@/components/AttendanceUpload";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";
import { attendanceApi } from "@/api/attendance";
import { deptApi } from "@/api/dept";
import type { Dept } from "@shared/schema";

export default function Attendance() {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  // Generate years: 5 years back and 5 years forward
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonthNum, setSelectedMonthNum] = useState<number>(currentMonth);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [additiveMode, setAdditiveMode] = useState(false);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [uploaderKey, setUploaderKey] = useState(0);
  const [deleteMonth, setDeleteMonth] = useState<string>(() => {
    const m = currentMonth;
    const y = currentYear;
    return `${String(m).padStart(2, "0")}-${y}`;
  });
  const [deleteDeptId, setDeleteDeptId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    deptApi.getAll().then((d) => setDepts(d ?? []));
  }, []);

  // Computed value for the combined month string (MM-YYYY format)
  const selectedMonth = `${String(selectedMonthNum).padStart(2, "0")}-${selectedYear}`;

  const handleUpload = async (records: any[]) => {
    try {
      const to2 = (n: number) => (Number.isFinite(n) ? n.toFixed(2) : "0.00");
      const payload = records.map((r) => {
        const working_days = r.total_working_days ?? (Array.isArray(r.dailyStatus) ? r.dailyStatus.length : 30);
        const present_days = Number(r.worked_days ?? 0);
        const absent_days = Math.max(Number(working_days) - present_days, 0);

        return {
          emp_id: r.emp_id,
          month: selectedMonth,
          working_days,
          present_days,
          absent_days,
          round_off: r.round_off !== undefined ? to2(r.round_off) : null,
          ot_hours_normal: to2(r.normal_ot),
          ot_hours_friday: to2(r.friday_ot),
          ot_hours_holiday: to2(r.holiday_ot),
          dues_earned: r.dues_earned !== undefined ? to2(r.dues_earned) : "0.00",
          comments: r.comments ?? "",
        };
      });

      const options = {
        month: selectedMonth,
        ...(selectedDeptId != null && { dept_id: selectedDeptId }),
        ...(additiveMode && { additive: true }),
      };
      const result = await attendanceApi.bulkCreate(payload as any, options);
      const created = Array.isArray(result) ? result : result.created;
      const message =
        typeof result === "object" && !Array.isArray(result) && result.message
          ? result.message
          : `Attendance records saved successfully.${created.length > 0 ? ` ${created.length} record(s) uploaded.` : ""}`;
      alert(message);
      setUploaderKey((k) => k + 1);
    } catch (err) {
      alert((err as Error).message || "Failed to save attendance records.");
    }
  };

  const handleDeleteUploadedSheet = async () => {
    if (!deleteMonth) return;
    const deptLabel = deleteDeptId != null ? depts.find((d) => d.id === deleteDeptId)?.name ?? "department" : "all";
    if (!confirm(`Delete all uploaded attendance for ${deleteMonth}${deleteDeptId != null ? ` (${deptLabel})` : ""}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const res = await attendanceApi.deleteByMonth(deleteMonth, deleteDeptId ?? undefined);
      alert(res.message || `Deleted ${res.deleted} record(s).`);
    } catch (err) {
      alert((err as Error).message || "Failed to delete attendance.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Upload Attendance</h1>
        <p className="text-muted-foreground">
          Import monthly attendance records from Excel or CSV files
        </p>
      </div>

      <div className="flex flex-wrap gap-4 max-w-3xl">
        <div className="flex-1 min-w-[140px]">
          <Label htmlFor="year" className="text-sm font-medium mb-2 block">
            Year
          </Label>
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger id="year" className="h-10">
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

        <div className="flex-1 min-w-[140px]">
          <Label htmlFor="month" className="text-sm font-medium mb-2 block">
            Month
          </Label>
          <Select 
            value={selectedMonthNum.toString()} 
            onValueChange={(val) => setSelectedMonthNum(parseInt(val))}
          >
            <SelectTrigger id="month" className="h-10" data-testid="select-month">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthNames.map((monthName, index) => (
                <SelectItem key={index + 1} value={(index + 1).toString()}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 min-w-[180px]">
          <Label htmlFor="dept" className="text-sm font-medium mb-2 block">
            Department
          </Label>
          <Select 
            value={selectedDeptId != null ? selectedDeptId.toString() : "all"} 
            onValueChange={(val) => setSelectedDeptId(val === "all" ? null : parseInt(val, 10))}
          >
            <SelectTrigger id="dept" className="h-10">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All (no dept filter)</SelectItem>
              {depts.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Select a department to upload only that dept’s attendance for this month; existing records for that dept will be replaced.
          </p>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <Checkbox
            id="additive"
            checked={additiveMode}
            onCheckedChange={(c) => setAdditiveMode(Boolean(c))}
          />
          <Label htmlFor="additive" className="text-sm font-normal cursor-pointer">
            Only add if missing (skip employees who already have attendance for this month)
          </Label>
        </div>
      </div>

      <AttendanceUpload key={uploaderKey} selectedMonth={selectedMonth} onUpload={handleUpload} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Delete uploaded attendance sheet
          </CardTitle>
          <CardDescription>
            Remove all attendance records for a month so you can re-upload or correct data. Optionally delete only one department&apos;s slice.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Month to delete</Label>
            <div className="flex gap-2">
              <Select
                value={deleteMonth ? deleteMonth.split("-")[1]! : ""}
                onValueChange={(y) => setDeleteMonth((prev) => (prev ? `${prev.split("-")[0]}-${y}` : `01-${y}`))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={deleteMonth ? deleteMonth.split("-")[0]! : ""}
                onValueChange={(m) => setDeleteMonth((prev) => (prev ? `${m}-${prev.split("-")[1]}` : `${m}-${currentYear}`))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {monthNames.map((name, i) => (
                    <SelectItem key={i} value={String(i + 1).padStart(2, "0")}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label className="text-sm">Department (optional)</Label>
            <Select
              value={deleteDeptId != null ? deleteDeptId.toString() : "all"}
              onValueChange={(v) => setDeleteDeptId(v === "all" ? null : parseInt(v, 10))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {depts.map((d) => (
                  <SelectItem key={d.id} value={d.id.toString()}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="destructive" onClick={handleDeleteUploadedSheet} disabled={deleting || !deleteMonth}>
            {deleting ? "Deleting…" : "Delete attendance for this month"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
