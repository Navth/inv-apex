import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

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
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "emp_id",
    "name",
    "designation",
    "salary",
    "worked_days",
    "normal_ot",
    "friday_ot",
    "holiday_ot",
    "allowances_earned",
    "dues_earned",
    "total_earnings",
    "comments",
  ]);
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
        const res = await fetch(`/api/reports?month=${encodeURIComponent(selectedMonth)}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || "Failed to load report");
        }
        const data = await res.json();
        setRows(Array.isArray(data) ? data : []);
      } catch (err: any) {
        console.error("Report load error:", err);
        setError(err.message || "Failed to load report");
        setRows([]);
      } finally {
        setLoading(false);
      }
    }

    loadReport();
  }, [selectedMonth]);

  const availableColumns = [
    { id: "emp_id", label: "Employee ID" },
    { id: "name", label: "Name" },
    { id: "designation", label: "Designation" },
    { id: "department", label: "Department" },
    { id: "salary", label: "Basic Salary" },
    { id: "worked_days", label: "Worked Days" },
    { id: "working_days", label: "Working Days" },
    { id: "normal_ot", label: "Normal OT Hours" },
    { id: "friday_ot", label: "Friday OT Hours" },
    { id: "holiday_ot", label: "Holiday OT Hours" },
    { id: "food_allow", label: "Food Allowance" },
    { id: "allowances_earned", label: "Allowances Earned" },
    { id: "dues_earned", label: "Dues Earned" },
    { id: "deductions", label: "Deductions" },
    { id: "gross_salary", label: "Gross Salary" },
    { id: "total_earnings", label: "Net Salary" },
    { id: "comments", label: "Comments" },
  ];

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const handleDownloadExcel = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }

    const columnMap: Record<string, string> = {};
    availableColumns.forEach((col) => {
      columnMap[col.id] = col.label;
    });

    const excelData = rows.map((row) => {
      const filteredRow: Record<string, any> = {};
      selectedColumns.forEach((colId) => {
        const label = columnMap[colId] || colId;
        let value = row[colId];

        if (
          typeof value === "number" &&
          ["salary", "food_allow", "allowances_earned", "dues_earned", "deductions", "gross_salary"].includes(colId)
        ) {
          value = parseFloat(value.toString()).toFixed(2);
        } else if (colId === "total_earnings" && typeof value === "number") {
          // Net salary is already rounded to integer on backend
          value = Math.round(value);
        }

        filteredRow[label] = value ?? "";
      });
      return filteredRow;
    });
// ✅ add total row for all numeric columns
const totalRow: Record<string, any> = {};
const firstSelectedLabel = columnMap[selectedColumns[0]] || selectedColumns[0];
totalRow[firstSelectedLabel] = "TOTAL";

// which columns should be summed numerically
const numericCols = [
  "salary",
  "worked_days",
  "working_days",
  "normal_ot",
  "friday_ot",
  "holiday_ot",
  "food_allow",
  "allowances_earned",
  "dues_earned",
  "deductions",
  "gross_salary",
  "total_earnings",
];

// for each selected column, if numeric → sum, else leave blank
selectedColumns.forEach((colId) => {
  const label = columnMap[colId] || colId;
  if (numericCols.includes(colId)) {
    const total = rows.reduce(
      (sum, row) => sum + (Number(row[colId]) || 0),
      0
    );
    // Round all totals to whole numbers (no decimals)
    totalRow[label] = Math.round(total);
  } else if (label !== firstSelectedLabel) {
    totalRow[label] = "";
  }
});

excelData.push(totalRow);



    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");

    const maxWidths: number[] = [];
    selectedColumns.forEach((colId, idx) => {
      const label = columnMap[colId] || colId;
      maxWidths[idx] = Math.max(label.length, 15);
    });
    worksheet["!cols"] = maxWidths.map((w) => ({ wch: w }));

    const filename = `Salary_Report_${selectedMonth}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  const handleDownloadCSV = () => {
    if (rows.length === 0) {
      alert("No data to export");
      return;
    }

    const columnMap: Record<string, string> = {};
    availableColumns.forEach((col) => {
      columnMap[col.id] = col.label;
    });

    const header = selectedColumns.map((colId) => columnMap[colId] || colId).join(",");

    const csvLines = rows.map((row) =>
      selectedColumns
        .map((colId) => {
          let value = row[colId] ?? "";
          if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",")
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
          <CardDescription>Aggregated payroll and attendance for selected month</CardDescription>
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

          <div className="space-y-3">
            <Label className="text-sm font-medium">Select Columns to Export</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border rounded-lg p-4">
              {availableColumns.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.id}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => toggleColumn(column.id)}
                    data-testid={`checkbox-${column.id}`}
                  />
                  <Label htmlFor={column.id} className="text-sm font-normal cursor-pointer">
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleDownload}
              disabled={selectedColumns.length === 0 || rows.length === 0 || loading}
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
