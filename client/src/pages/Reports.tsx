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
import * as XLSX from "xlsx-js-style";
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

    const monthLabel = formatMonthLabel(selectedMonth);
    
    // Template column structure (matching the template exactly)
    const templateColumns = [
      { key: "emp_id", header: "emp id", width: 12 },
      { key: "month", header: "Month", width: 15 },
      { key: "accommodation", header: "Accommodation", width: 15 },
      { key: "visa", header: "Visa", width: 12 },
      { key: "project", header: "Project/place of work", width: 20 },
      { key: "name", header: "Name", width: 25 },
      { key: "designation", header: "DESIGNATION", width: 18 },
      { key: "salary", header: "Salary", width: 12, numeric: true },
      { key: "worked_days", header: "Worked Days", width: 12, numeric: true },
      { key: "normal_ot", header: "Normal O.T", width: 12, numeric: true },
      { key: "friday_ot", header: "Friday O.T", width: 12, numeric: true },
      { key: "holiday_ot", header: "Public holiday O.T", width: 18, numeric: true },
      { key: "deductions", header: "Deductions", width: 12, numeric: true },
      { key: "salary_earned", header: "Salary Earned", width: 14, numeric: true },
      { key: "food_allow", header: "Food allowance earned", width: 20, numeric: true },
      { key: "allowances_earned", header: "Allowances earned", width: 18, numeric: true },
      { key: "dues_earned", header: "Dues earned", width: 12, numeric: true },
      { key: "not_earned", header: "NOT Earned", width: 14, numeric: true },
      { key: "fot_earned", header: "FOT Earned", width: 12, numeric: true },
      { key: "hot_earned", header: "HOT Earned", width: 12, numeric: true },
      { key: "total_earnings", header: "Total Earnings", width: 14, numeric: true },
      { key: "comments", header: "Comments", width: 25 },
    ];

    // Style definitions
    const headerStyle = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "4472C4" } },
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
      border: {
        top: { style: "thin", color: { rgb: "000000" } },
        bottom: { style: "thin", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    const titleStyle = {
      font: { bold: true, sz: 14 },
      alignment: { horizontal: "left", vertical: "center" },
    };

    const monthStyle = {
      font: { bold: true, sz: 12 },
      alignment: { horizontal: "left", vertical: "center" },
    };

    const dataStyle = {
      alignment: { horizontal: "left", vertical: "center" },
      border: {
        top: { style: "thin", color: { rgb: "D9D9D9" } },
        bottom: { style: "thin", color: { rgb: "D9D9D9" } },
        left: { style: "thin", color: { rgb: "D9D9D9" } },
        right: { style: "thin", color: { rgb: "D9D9D9" } },
      },
    };

    const numericDataStyle = {
      ...dataStyle,
      alignment: { horizontal: "right", vertical: "center" },
      numFmt: "#,##0.00",
    };

    const totalRowStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "E2EFDA" } },
      alignment: { horizontal: "right", vertical: "center" },
      border: {
        top: { style: "medium", color: { rgb: "000000" } },
        bottom: { style: "medium", color: { rgb: "000000" } },
        left: { style: "thin", color: { rgb: "000000" } },
        right: { style: "thin", color: { rgb: "000000" } },
      },
    };

    // Create worksheet data array
    const wsData: any[][] = [];

    // Row 1: Title and Month
    const titleRow = new Array(templateColumns.length).fill("");
    titleRow[1] = { v: "Gas Emission control- Salary working", s: titleStyle };
    titleRow[5] = { v: `Month: ${monthLabel}`, s: monthStyle };
    wsData.push(titleRow);

    // Row 2: Column headers
    const headerRow = templateColumns.map((col) => ({
      v: col.header,
      s: headerStyle,
    }));
    wsData.push(headerRow);

    // Data rows (starting at row 3)
    let salaryTotal = 0;
    let workedDaysTotal = 0;
    let normalOtTotal = 0;
    let fridayOtTotal = 0;
    let holidayOtTotal = 0;
    let deductionsTotal = 0;
    let salaryEarnedTotal = 0;
    let foodAllowTotal = 0;
    let allowancesTotal = 0;
    let duesTotal = 0;
    let notEarnedTotal = 0;
    let fotEarnedTotal = 0;
    let hotEarnedTotal = 0;
    let totalEarningsTotal = 0;

    rows.forEach((row) => {
      // Use OT earned amounts from backend
      const notEarned = Number(row.ot_normal_amount) || 0;
      const fotEarned = Number(row.ot_friday_amount) || 0;
      const hotEarned = Number(row.ot_holiday_amount) || 0;
      
      // Use salary earned from backend
      const salaryEarned = Number(row.salary_earned) || 0;

      const dataRow = templateColumns.map((col) => {
        let value: any = "";
        const style = col.numeric ? numericDataStyle : dataStyle;

        switch (col.key) {
          case "emp_id":
            value = row.emp_id || "";
            break;
          case "month":
            value = monthLabel;
            break;
          case "accommodation":
            value = row.accommodation || "";
            break;
          case "visa":
            value = row.visa || "";
            break;
          case "project":
            value = row.department || "";
            break;
          case "name":
            value = row.name || "";
            break;
          case "designation":
            value = row.designation || "";
            break;
          case "salary":
            value = Number(row.salary) || 0;
            salaryTotal += value;
            break;
          case "worked_days":
            value = Number(row.worked_days) || 0;
            workedDaysTotal += value;
            break;
          case "normal_ot":
            value = Number(row.normal_ot) || 0;
            normalOtTotal += value;
            break;
          case "friday_ot":
            value = Number(row.friday_ot) || 0;
            fridayOtTotal += value;
            break;
          case "holiday_ot":
            value = Number(row.holiday_ot) || 0;
            holidayOtTotal += value;
            break;
          case "deductions":
            value = Number(row.deductions) || 0;
            deductionsTotal += value;
            break;
          case "salary_earned":
            value = Number(salaryEarned) || 0;
            salaryEarnedTotal += value;
            break;
          case "food_allow":
            value = Number(row.food_allow) || 0;
            foodAllowTotal += value;
            break;
          case "allowances_earned":
            value = Number(row.allowances_earned) || 0;
            allowancesTotal += value;
            break;
          case "dues_earned":
            value = Number(row.dues_earned) || 0;
            duesTotal += value;
            break;
          case "not_earned":
            value = Number(notEarned) || 0;
            notEarnedTotal += value;
            break;
          case "fot_earned":
            value = Number(fotEarned) || 0;
            fotEarnedTotal += value;
            break;
          case "hot_earned":
            value = Number(hotEarned) || 0;
            hotEarnedTotal += value;
            break;
          case "total_earnings":
            value = Number(row.total_earnings) || 0;
            totalEarningsTotal += value;
            break;
          case "comments":
            value = row.comments || "";
            break;
          default:
            value = "";
        }

        return { v: value, s: style, t: col.numeric ? "n" : "s" };
      });

      wsData.push(dataRow);
    });

    // Total row
    const totalRow = templateColumns.map((col, idx) => {
      let value: any = "";
      
      if (idx === 0) {
        return { v: "TOTAL", s: { ...totalRowStyle, font: { bold: true }, alignment: { horizontal: "left" } } };
      }
      
      switch (col.key) {
        case "salary":
          value = salaryTotal;
          break;
        case "worked_days":
          value = workedDaysTotal;
          break;
        case "normal_ot":
          value = normalOtTotal;
          break;
        case "friday_ot":
          value = fridayOtTotal;
          break;
        case "holiday_ot":
          value = holidayOtTotal;
          break;
        case "deductions":
          value = deductionsTotal;
          break;
        case "salary_earned":
          value = salaryEarnedTotal;
          break;
        case "food_allow":
          value = foodAllowTotal;
          break;
        case "allowances_earned":
          value = allowancesTotal;
          break;
        case "dues_earned":
          value = duesTotal;
          break;
        case "not_earned":
          value = notEarnedTotal;
          break;
        case "fot_earned":
          value = fotEarnedTotal;
          break;
        case "hot_earned":
          value = hotEarnedTotal;
          break;
        case "total_earnings":
          value = totalEarningsTotal;
          break;
        default:
          return { v: "", s: totalRowStyle };
      }

      return { v: Math.round(value), s: totalRowStyle, t: "n" };
    });

    wsData.push(totalRow);

    // Create worksheet from array of arrays
    const worksheet = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    worksheet["!cols"] = templateColumns.map((col) => ({ wch: col.width }));

    // Set row heights
    worksheet["!rows"] = [
      { hpt: 25 }, // Title row
      { hpt: 30 }, // Header row
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${monthLabel} - Salary working`);

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
