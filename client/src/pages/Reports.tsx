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
import { buildStyledExcel, downloadStyledExcel } from "@/lib/excelExport";
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
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => [
    "emp_id", "month", "accommodation", "project_place_of_work", "name", "designation", "salary",
    "worked_days", "normal_ot", "friday_ot", "holiday_ot", "deductions", "salary_earned", "food_allow",
    "allowances_earned", "dues_earned", "not_earned", "fot_earned", "hot_earned", "gross_salary",
    "comments", "visa_cost_recovery", "doj", "leave_balance", "category", "count",
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

  const availableColumns = [
    { id: "emp_id", label: "emp id" },
    { id: "month", label: "Month" },
    { id: "accommodation", label: "Accommodation" },
    { id: "project_place_of_work", label: "Project/place of work" },
    { id: "name", label: "Name" },
    { id: "designation", label: "DESIGNATION" },
    { id: "salary", label: "Salary" },
    { id: "worked_days", label: "Worked Days" },
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
    { id: "gross_salary", label: "Total Earnings" },
    { id: "comments", label: "Comments" },
    { id: "visa_cost_recovery", label: "Visa cost recovery" },
    { id: "doj", label: "DATE OF JOINING" },
    { id: "leave_balance", label: "Leave Balance" },
    { id: "category", label: "Category" },
    { id: "count", label: "Count" },
    { id: "department", label: "Department" },
    { id: "working_days", label: "Working Days" },
    { id: "total_earnings", label: "Net Salary" },
  ];
  const detailedFormatColumnIds = [
    "emp_id", "month", "accommodation", "project_place_of_work", "name", "designation", "salary",
    "worked_days", "normal_ot", "friday_ot", "holiday_ot", "deductions", "salary_earned", "food_allow",
    "allowances_earned", "dues_earned", "not_earned", "fot_earned", "hot_earned", "gross_salary",
    "comments", "visa_cost_recovery", "doj", "leave_balance", "category", "count",
  ];

  const toggleColumn = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const handleDownloadExcel = async () => {
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
        if (colId === "month" && typeof value === "string" && /^\d{2}-\d{4}$/.test(value)) {
          const [mm, yyyy] = value.split("-");
          const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          value = `${monthNamesShort[parseInt(mm!, 10) - 1]}-${yyyy!.slice(2)}`;
        }
        if (
          typeof value === "number" &&
          ["salary", "food_allow", "allowances_earned", "dues_earned", "deductions", "gross_salary", "salary_earned", "not_earned", "fot_earned", "hot_earned"].includes(colId)
        ) {
          value = parseFloat(value.toString()).toFixed(2);
        } else if (colId === "total_earnings" && typeof value === "number") {
          value = Math.round(value);
        }

        filteredRow[label] = value ?? "";
      });
      return filteredRow;
    });

const totalRow: Record<string, any> = {};
const firstSelectedLabel = columnMap[selectedColumns[0]] || selectedColumns[0];
totalRow[firstSelectedLabel] = "TOTAL";

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
  "salary_earned",
  "not_earned",
  "fot_earned",
  "hot_earned",
];

selectedColumns.forEach((colId) => {
  const label = columnMap[colId] || colId;
  if (numericCols.includes(colId)) {
    const total = rows.reduce(
      (sum, row) => sum + (Number(row[colId]) || 0),
      0
    );
    totalRow[label] = Math.round(total);
  } else if (label !== firstSelectedLabel) {
    totalRow[label] = "";
  }
});

excelData.push(totalRow);



    const headers = selectedColumns.map((colId) => columnMap[colId] || colId);
    const maxWidths = selectedColumns.map((colId) => {
      const label = columnMap[colId] || colId;
      return Math.max(label.length, 14);
    });

    const buffer = await buildStyledExcel({
      sheetName: "Report",
      headers,
      rows: excelData,
      columnWidths: maxWidths,
    });
    const filename = `Salary_Report_${selectedMonth}.xlsx`;
    downloadStyledExcel(buffer, filename);
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

  const handleDownload = async () => {
    if (format === "excel") {
      await handleDownloadExcel();
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
            Aggregated payroll and attendance for selected month. &quot;Worked Days&quot; is the value used for salary (round-off from Excel when present, else present days). &quot;Working Days&quot; is the period total from the sheet.
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
