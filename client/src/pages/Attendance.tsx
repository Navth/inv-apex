import { useState, useEffect } from "react";
import AttendanceUpload from "@/components/AttendanceUpload";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";

export default function Attendance() {
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [uploaderKey, setUploaderKey] = useState(0);
useEffect(() => {
  async function generateMonths() {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];

    try {
      // Fetch existing data from attendance & payroll tables
      const [attendanceRes, payrollRes] = await Promise.all([
        fetch("/api/attendance", { credentials: "include" }),
        fetch("/api/payroll", { credentials: "include" })
      ]);

      const attendanceData = attendanceRes.ok ? await attendanceRes.json() : [];
      const payrollData = payrollRes.ok ? await payrollRes.json() : [];

      // Extract unique months from both tables
      const allMonthsSet = new Set<string>();
      
      attendanceData.forEach((record: any) => {
        if (record.month) allMonthsSet.add(record.month);
      });
      
      payrollData.forEach((record: any) => {
        if (record.month) allMonthsSet.add(record.month);
      });

      // Convert to array and parse dates
      const existingMonths: { value: string; label: string; date: Date }[] = [];
      allMonthsSet.forEach(monthStr => {
        try {
          // Only accept MM-YYYY format (e.g., "12-2025")
          const parts = monthStr.split('-');
          if (parts.length !== 2) return;
          
          const [mm, yyyy] = parts;
          const monthNum = parseInt(mm);
          const yearNum = parseInt(yyyy);
          
          // Validate month (1-12) and year (4 digits)
          if (monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) return;
          
          const date = new Date(yearNum, monthNum - 1, 1);
          const label = `${monthNames[date.getMonth()]} ${yyyy}`;
          existingMonths.push({ 
            value: `${mm.padStart(2, '0')}-${yyyy}`, 
            label, 
            date 
          });
        } catch {}
      });

      // Add current year months (even if no data)
      const now = new Date();
      const currentYear = now.getFullYear();
      for (let month = 1; month <= 12; month++) {
        const date = new Date(currentYear, month - 1, 1);
        const mm = String(month).padStart(2, "0");
        const yyyy = currentYear;
        const value = `${mm}-${yyyy}`;
        const label = `${monthNames[month - 1]} ${yyyy}`;
        
        existingMonths.push({ value, label, date });
      }

      // Add next 6 months for future planning
      for (let i = 0; i <= 6; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() + i + 1, 1);
        const mm = String(date.getMonth() + 1).padStart(2, "0");
        const yyyy = date.getFullYear();
        const value = `${mm}-${yyyy}`;
        const label = `${monthNames[date.getMonth()]} ${yyyy}`;
        existingMonths.push({ value, label, date });
      }

      // Remove duplicates and sort by date (newest first)
      const uniqueMonths = Array.from(
        new Map(existingMonths.map(item => [item.value, item])).values()
      );
      
      uniqueMonths.sort((a, b) => b.date.getTime() - a.date.getTime());

      // Clean for state (remove date property)
      const cleanMonths = uniqueMonths.map(({ value, label }) => ({ value, label }));
      setMonths(cleanMonths);

      // Set current month as default
      const currentMonth = `${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
      setSelectedMonth(currentMonth);

    } catch (error) {
      console.error("Failed to fetch existing months:", error);
      // Fallback to current year months
      generateCurrentYearMonths();
    }
  }

  // Fallback function
  function generateCurrentYearMonths() {
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const now = new Date();
    const currentYear = now.getFullYear();
    const allMonths: { value: string; label: string }[] = [];

    for (let month = 1; month <= 12; month++) {
      const mm = String(month).padStart(2, "0");
      const value = `${mm}-${currentYear}`;
      const label = `${monthNames[month - 1]} ${currentYear}`;
      allMonths.push({ value, label });
    }
    setMonths(allMonths);
    setSelectedMonth(`${String(now.getMonth() + 1).padStart(2, "0")}-${currentYear}`);
  }

  generateMonths();
}, []);
function formatMonthLabel(monthStr: string) {
  if (!monthStr) return "";
  const [mm, yyyy] = monthStr.split("-");
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = parseInt(mm, 10) - 1;
  return `${monthNames[monthIndex]} ${yyyy}`;
}

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

      await apiRequest("POST", "/api/attendance/bulk", payload);
      alert("Attendance records saved successfully.");
      setUploaderKey((k) => k + 1);
    } catch (err) {
      console.error(err);
      alert("Failed to save attendance records.");
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

      <div className="max-w-xs">
        <Label htmlFor="month" className="text-sm font-medium mb-2 block">
          Select Month
        </Label>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger id="month" className="h-10" data-testid="select-month">
            <SelectValue placeholder="Select month" />
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

      <AttendanceUpload key={uploaderKey} selectedMonth={selectedMonth} onUpload={handleUpload} />
    </div>
  );
}
