import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";
import { reportsApi } from "@/api/reports";

export default function Reports() {
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
  const [format, setFormat] = useState("excel");
  // Fixed column order matching the example format
  const REPORT_COLUMNS = [
    { id: "emp_id", label: "emp id" },
    { id: "month_display", label: "Month" },
    { id: "accommodation", label: "Accommodation" },
    { id: "project_place", label: "Project/place of work" },
    { id: "name", label: "Name" },
    { id: "designation", label: "DESIGNATION" },
    { id: "salary", label: "Salary" },
    { id: "worked_days", label: "Worked Days" },
    { id: "working_days", label: "Working Days" },
    { id: "normal_ot", label: "Normal O.T" },
    { id: "friday_ot", label: "Friday O.T" },
    { id: "holiday_ot", label: "Public holiday O.T" },
    { id: "deductions", label: "Deductions" },
    { id: "salary_earned", label: "Salary Earned" },
    { id: "food_allow", label: "Food allowance earned" },
    { id: "allowances_earned", label: "Allowances earned" },
    { id: "dues_earned", label: "Dues earned" },
    { id: "not_earned", label: "NOT Earned" },
    { id: "fot_earned", label: "FOT Earned" },
    { id: "hot_earned", label: "HOT Earned" },
    { id: "total_earnings", label: "Total Earnings" },
    { id: "comments", label: "Comments" },
    { id: "visa_cost_recovery", label: "Visa cost recovery" },
    { id: "doj", label: "DATE OF JOINING" },
    { id: "leave_balance", label: "Leave Balance" },
    { id: "category", label: "Category" },
    { id: "count", label: "Count" },
  ] as const;
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Computed value for the combined month string (MM-YYYY format)
  const selectedMonth = `${String(selectedMonthNum).padStart(2, "0")}-${selectedYear}`;

  function formatMonthLabel(monthStr: string) {
    if (!monthStr) return "";
    const [mm, yyyy] = monthStr.split("-");
    const monthIndex = parseInt(mm, 10) - 1;
    return `${monthNames[monthIndex]} ${yyyy}`;
  }

  useEffect(() => {
    if (!selectedMonth) return;

    async function loadReport() {
      setLoading(true);
      setError(null);
      try {
        const data = await reportsApi.get(selectedMonth);
        setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err.message || "Failed to load report");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [selectedMonth]);

  const handleDownloadExcel = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }

    const numericCols = new Set([
      "salary", "worked_days", "working_days", "normal_ot", "friday_ot", "holiday_ot",
      "deductions", "salary_earned", "food_allow", "allowances_earned",
      "dues_earned", "not_earned", "fot_earned", "hot_earned",
      "total_earnings", "visa_cost_recovery", "count",
    ]);

    const excelData: (string | number)[][] = [];

    // Title row: "Flow Line - Project Department - Month: January-2025"
    const monthLabel = formatMonthLabel(selectedMonth).replace(" ", "-");
    excelData.push([`Flow Line - Project Department - Month: ${monthLabel}`]);

    // Header row
    excelData.push(REPORT_COLUMNS.map((c) => c.label));

    // Data rows
    rows.forEach((row) => {
      excelData.push(
        REPORT_COLUMNS.map((col) => {
          let val = row[col.id];
          if (val === undefined || val === null) val = "";
          if (numericCols.has(col.id) && typeof val === "number") {
            return ["salary_earned", "food_allow", "allowances_earned", "dues_earned", "not_earned", "fot_earned", "hot_earned", "total_earnings"].includes(col.id)
              ? Math.round(val * 100) / 100
              : Math.round(val);
          }
          return val;
        })
      );
    });

    // TOTAL row
    const totalRow: (string | number)[] = [];
    REPORT_COLUMNS.forEach((col, idx) => {
      if (idx === 0) {
        totalRow.push("TOTAL");
      } else if (numericCols.has(col.id)) {
        const total = rows.reduce((sum, r) => sum + (Number((r as any)[col.id]) || 0), 0);
        totalRow.push(Math.round(total));
      } else {
        totalRow.push("");
      }
    });
    excelData.push(totalRow);

    const worksheet = XLSX.utils.aoa_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    worksheet["!cols"] = REPORT_COLUMNS.map((_, i) => ({ wch: i === 0 ? 12 : 14 }));

    const filename = `Salary_Report_${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleDownloadCSV = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }

    const header = REPORT_COLUMNS.map((c) => c.label).join(",");

    const csvLines = rows.map((row) =>
      REPORT_COLUMNS.map((col) => {
        let value = (row as any)[col.id] ?? "";
        if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(",")
    );

    const csvContent = [header, ...csvLines].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Salary_Report_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = () => {
    if (format === "excel") {
      handleDownloadExcel();
    } else {
      handleDownloadCSV();
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-semibold mb-2">Reports</h1>
        <p className="text-muted-foreground">Download salary sheets and payroll reports</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Salary Sheet</CardTitle>
          <CardDescription>
            Aggregated payroll and attendance for selected month. Salary is calculated using{" "}
            <strong>round off</strong> from the attendance Excel when available (authoritative figure).
            <br />
            <span className="text-muted-foreground text-sm mt-1 block">
              <strong>Worked Days</strong> = Days used for salary (from round off or present days).{" "}
              <strong>Working Days</strong> = Total expected days in the month (e.g. 26 or 27).
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="report-year" className="text-sm font-medium">
                Select Year
              </Label>
              <Select 
                value={selectedYear.toString()} 
                onValueChange={(val) => setSelectedYear(parseInt(val))}
              >
                <SelectTrigger id="report-year" className="h-10">
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

            <div className="space-y-2">
              <Label htmlFor="report-month" className="text-sm font-medium">
                Select Month
              </Label>
              <Select 
                value={selectedMonthNum.toString()} 
                onValueChange={(val) => setSelectedMonthNum(parseInt(val))}
              >
                <SelectTrigger
                  id="report-month"
                  className="h-10"
                  data-testid="select-report-month"
                >
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

          <div className="space-y-2">
            <Label htmlFor="format" className="text-sm font-medium">
                Export Format
              </Label>
              <Select value={format} onValueChange={setFormat}>
                <SelectTrigger id="format" className="h-10" data-testid="select-format">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={rows.length === 0 || loading}
              data-testid="button-download-report"
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? "Loading..." : "Download Report"}
            </Button>
            {format === "excel" ? (
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
            ) : (
              <FileText className="h-10 w-10 text-muted-foreground" />
            )}
          </div>

          <div className="mt-6 space-y-2">
            {loading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <p>Loading report data...</p>
              </div>
            )}
            {error && <p className="text-destructive text-sm">Error: {error}</p>}
            {!loading && !error && rows.length === 0 && (
              <p className="text-muted-foreground">
                No data available for {formatMonthLabel(selectedMonth)}
              </p>
            )}
            {!loading && !error && rows.length > 0 && (
              <p className="text-sm text-muted-foreground">
                Found {rows.length} employee record{rows.length !== 1 ? "s" : ""} for{" "}
                {formatMonthLabel(selectedMonth)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
