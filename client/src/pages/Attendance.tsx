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
  const [uploaderKey, setUploaderKey] = useState(0);

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

      <div className="flex gap-4 max-w-md">
        <div className="flex-1">
          <Label htmlFor="year" className="text-sm font-medium mb-2 block">
            Select Year
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

        <div className="flex-1">
          <Label htmlFor="month" className="text-sm font-medium mb-2 block">
            Select Month
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
      </div>

      <AttendanceUpload key={uploaderKey} selectedMonth={selectedMonth} onUpload={handleUpload} />
    </div>
  );
}
