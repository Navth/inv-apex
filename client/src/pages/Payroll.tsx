import { useState, useEffect } from "react";
import PayrollTable from "@/components/PayrollTable";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calculator, RefreshCw } from "lucide-react";
import { buildStyledExcel, downloadStyledExcel } from "@/lib/excelExport";
import { payrollApi } from "@/api/payroll";
import { deptApi } from "@/api/dept";
import type { Dept } from "@shared/schema";

export default function Payroll() {
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
  const [depts, setDepts] = useState<Dept[]>([]);
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    deptApi.getAll().then((d) => setDepts(d ?? []));
  }, []);

  // Computed value for the combined month string (MM-YYYY format)
  const selectedMonth = `${String(selectedMonthNum).padStart(2, "0")}-${selectedYear}`;

  function formatMonthLabel(monthStr: string) {
    if (!monthStr) return "";
    const [mm, yyyy] = monthStr.split("-");
    const monthIndex = parseInt(mm, 10) - 1;
    return `${monthNames[monthIndex]} ${yyyy}`;
  }

  // Fetch payroll data when selectedMonth or selectedDeptId changes
  useEffect(() => {
    if (!selectedMonth) return;

    async function fetchPayroll() {
      setLoading(true);
      try {
        const data = await payrollApi.getAll(selectedMonth, selectedDeptId);
        setPayrollData(Array.isArray(data) ? data : []);
      } catch (err) {
        setPayrollData([]);
      } finally {
        setLoading(false);
      }
    }

    fetchPayroll();
  }, [selectedMonth, selectedDeptId]);

  // Calculate payroll for selected month
  async function handleCalculate() {
    if (!selectedMonth) {
      alert("Please select a month");
      return;
    }
    else{
      alert("Payroll calculation in progress. Please do not navigate away from the page.");
    
    }

    const deptLabel = selectedDeptId != null ? depts.find((d) => d.id === selectedDeptId)?.name ?? "selected department" : "all employees";
    const confirmed = window.confirm(
      `Generate payroll for ${formatMonthLabel(selectedMonth)}${selectedDeptId != null ? ` (${deptLabel} only)` : ""}? This will calculate salary based on attendance data.`
    );
    if (!confirmed) return;

    setCalculating(true);
    try {
      const result = await payrollApi.generate(selectedMonth, { dept_id: selectedDeptId ?? undefined });
      
      // Show detailed message
      let message = result.message || `Payroll generated successfully for ${result.count || 0} employees`;
      
      if (result.warnings && result.warnings.length > 0) {
        const warningList = result.warnings
          .map((w: any) => `- ${w.emp_id} (${w.name}): ${w.error}`)
          .join('\n');
        message += `\n\nWarnings:\n${warningList}`;
      }
      
      alert(message);
      
      // Refresh payroll data
      const data = await payrollApi.getAll(selectedMonth, selectedDeptId);
      setPayrollData(Array.isArray(data) ? data : []);
    } catch (err) {
      alert(`Failed to generate payroll: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setCalculating(false);
    }
  }

  // Refresh data manually
  async function handleRefresh() {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      const data = await payrollApi.getAll(selectedMonth, selectedDeptId);
      setPayrollData(Array.isArray(data) ? data : []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  // Save edited payroll data
  async function handleSave(data: any[], silent = false) {
    if (!selectedMonth) return;
    
    setLoading(true);
    try {
      // Update each payroll record
      for (const row of data) {
        await payrollApi.update(row.emp_id, selectedMonth, {
          basic_salary: row.basic_salary,
          ot_amount: row.ot_amount,
          food_allowance: row.food_allowance,
          gross_salary: row.gross_salary,
          deductions: row.deductions,
          net_salary: row.net_salary,
        });
      }

      if (!silent) alert("Payroll saved successfully");
      await handleRefresh();
    } catch (err) {
      alert(`Failed to save payroll: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  }

  // Approve and finalize payroll
  async function handleApprove(data: any[]) {
    const confirmed = window.confirm(
      `Download payroll sheet for ${formatMonthLabel(selectedMonth)}?`
    );

    if (!confirmed) return;

    // First save the data silently
    await handleSave(data, true);

    // Generate styled Excel (colored columns)
    try {
      const headers = [
        "Emp ID",
        "Employee Name",
        "Days Worked",
        "Basic Salary",
        "OT Amount",
        "Food Allowance",
        "Gross Salary",
        "Deductions",
        "Net Salary",
        "Comments",
      ];
      const exportData = data.map((row) => ({
        "Emp ID": row.emp_id,
        "Employee Name": row.name || "",
        "Days Worked": Number(row.days_worked ?? 0),
        "Basic Salary": Number(row.basic_salary),
        "OT Amount": Number(row.ot_amount),
        "Food Allowance": Number(row.food_allowance),
        "Gross Salary": Number(row.gross_salary),
        "Deductions": Number(row.deductions),
        "Net Salary": Number(row.net_salary),
        "Comments": row.comments || "",
      }));

      const buffer = await buildStyledExcel({
        sheetName: "Payroll",
        headers,
        rows: exportData,
        columnWidths: [12, 22, 12, 14, 12, 16, 14, 12, 12, 24],
      });
      const filename = `Payroll_${selectedMonth}.xlsx`;
      downloadStyledExcel(buffer, filename);

      // Reset state to accommodate next action
      setPayrollData([]);
      setSelectedYear(currentYear);
      setSelectedMonthNum(currentMonth);
      
    } catch (err) {
      alert("Failed to generate Excel file");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Generate Payroll</h1>
          <p className="text-muted-foreground">
            Calculate and approve monthly salary payments
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRefresh}
          disabled={loading || !selectedMonth}
          data-testid="button-refresh"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="flex items-end gap-4">
        <div className="flex-1">
          <Label htmlFor="payroll-year" className="text-sm font-medium mb-2 block">
            Select Year
          </Label>
          <Select 
            value={selectedYear.toString()} 
            onValueChange={(val) => setSelectedYear(parseInt(val))}
          >
            <SelectTrigger id="payroll-year" className="h-10">
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
          <Label htmlFor="payroll-month" className="text-sm font-medium mb-2 block">
            Select Month
          </Label>
          <Select 
            value={selectedMonthNum.toString()} 
            onValueChange={(val) => setSelectedMonthNum(parseInt(val))}
          >
            <SelectTrigger id="payroll-month" className="h-10" data-testid="select-payroll-month">
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

        <div className="flex-1 min-w-[160px]">
          <Label htmlFor="payroll-dept" className="text-sm font-medium mb-2 block">
            Department
          </Label>
          <Select 
            value={selectedDeptId != null ? selectedDeptId.toString() : "all"} 
            onValueChange={(val) => setSelectedDeptId(val === "all" ? null : parseInt(val, 10))}
          >
            <SelectTrigger id="payroll-dept" className="h-10">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {depts.map((d) => (
                <SelectItem key={d.id} value={d.id.toString()}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Generate for one department or everyone
          </p>
        </div>

        <Button
          onClick={handleCalculate}
          data-testid="button-calculate"
          disabled={!selectedMonth || calculating || loading}
        >
          <Calculator className="h-4 w-4 mr-2" />
          {calculating ? "Calculating..." : "Calculate Payroll"}
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading payroll data...</p>
        </div>
      ) : payrollData.length > 0 ? (
        <PayrollTable data={payrollData} onSave={handleSave} onApprove={handleApprove} />
      ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            No payroll data available for {formatMonthLabel(selectedMonth)}
          </p>
          <p className="text-sm text-muted-foreground">
            Click "Calculate Payroll" to generate salary data based on attendance records
          </p>
        </div>
      )}
    </div>
  );
}
