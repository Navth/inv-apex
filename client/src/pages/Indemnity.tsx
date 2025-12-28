import { useEffect, useState } from "react";
import IndemnityTable from "@/components/IndemnityTable";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Users, Calculator, RefreshCw } from "lucide-react";

interface EmployeeLite {
  emp_id: string;
  name: string;
  designation: string;
  doj: string;
  basic_salary: string;
}

interface IndemnityRow {
  emp_id: string;
  years_of_service: number;
  indemnity_amount: number;
  status: "Active" | "Paid" | "Pending";
}

export default function Indemnity() {
  const [records, setRecords] = useState<any[]>([]);
  const [employees, setEmployees] = useState<Record<string, EmployeeLite>>({});
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [indRes, empRes] = await Promise.all([
        fetch("/api/indemnity", { credentials: "include" }),
        fetch("/api/employees", { credentials: "include" }),
      ]);
      const indemnity = indRes.ok ? await indRes.json() : [];
      const emps = empRes.ok ? await empRes.json() : [];
      const map: Record<string, EmployeeLite> = {};
      (emps || []).forEach((e: any) => {
        map[e.emp_id] = {
          emp_id: e.emp_id,
          name: e.name,
          designation: e.designation,
          doj: e.doj,
          basic_salary: e.basic_salary,
        };
      });
      setEmployees(map);
      const tableRows = (indemnity || []).map((r: any) => ({
        emp_id: r.emp_id,
        emp_name: map[r.emp_id]?.name || r.emp_id,
        designation: map[r.emp_id]?.designation || "",
        doj: map[r.emp_id]?.doj || "",
        years_of_service: Number(r.years_of_service || 0),
        basic_salary: Number(map[r.emp_id]?.basic_salary || 0),
        indemnity_amount: Number(r.indemnity_amount || 0),
        status: r.status as "Active" | "Paid" | "Pending",
      }));
      setRecords(tableRows);
    } catch (err) {
      console.error("Failed to load indemnity data", err);
      alert("Failed to load indemnity data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Calculate indemnity for all employees
  const handleCalculateAll = async () => {
    const confirmed = window.confirm(
      "This will recalculate indemnity for all employees based on current data. Continue?"
    );
    if (!confirmed) return;

    setCalculating(true);
    try {
      const res = await fetch("/api/indemnity/calculate", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to calculate indemnity");
      }

      alert("Indemnity calculated successfully for all employees");
      await loadData(); // Refresh data
    } catch (err) {
      console.error("Failed to calculate indemnity", err);
      alert("Failed to calculate indemnity");
    } finally {
      setCalculating(false);
    }
  };

  // Mark indemnity as paid
  const handlePay = async (empId: string) => {
    const confirmed = window.confirm(
      "Mark this indemnity as paid? This action cannot be undone."
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/indemnity/${empId}/pay`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to mark as paid");
      }

      alert("Indemnity marked as paid successfully");
      await loadData(); // Refresh data
    } catch (err) {
      console.error("Failed to mark as paid", err);
      alert("Failed to mark indemnity as paid");
    }
  };

  const handleEdit = (record: any) => {
    console.log("Edit indemnity record:", record);
    // TODO: Implement edit modal or navigation
  };

  const totalIndemnity = records.reduce((acc, r: any) => acc + r.indemnity_amount, 0);
  const activeRecords = records.filter((r: any) => r.status === "Active").length;
  const paidRecords = records.filter((r: any) => r.status === "Paid").length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-semibold mb-2">Indemnity Management</h1>
          <p className="text-muted-foreground">
            Track and manage employee indemnity calculations and payments
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
            data-testid="button-refresh"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={handleCalculateAll}
            disabled={calculating || loading}
            data-testid="button-calculate-all"
          >
            <Calculator className="h-4 w-4 mr-2" />
            {calculating ? "Calculating..." : "Calculate All"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Indemnity Liability
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalIndemnity.toLocaleString("en-US", {
                style: "currency",
                currency: "KWD",
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Records
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeRecords}</div>
            <p className="text-xs text-muted-foreground mt-1">Current employees</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Paid Out
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{paidRecords}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed payments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Indemnity Records</CardTitle>
          <CardDescription>
            Employee end-of-service benefit calculations based on years of service
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No indemnity records found. Click "Calculate All" to generate.
            </div>
          ) : (
            <IndemnityTable records={records} onPay={handlePay} onEdit={handleEdit} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kuwait Indemnity Calculation Method</CardTitle>
          <CardDescription>How indemnity is calculated for employees</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            <strong>First 5 years:</strong> 15 days of basic salary per year of service
          </p>
          <p>
            <strong>After 5 years:</strong> 30 days of basic salary per year of service
          </p>
          <p className="text-muted-foreground mt-4">
            <strong>Formula:</strong>
            <br />
            • If service ≤ 5 years: (Basic Salary × 15 ÷ 30) × Years of Service
            <br />• If service &gt; 5 years: [(Basic Salary × 15 ÷ 30) × 5] + [(Basic Salary × 30
            ÷ 30) × (Years - 5)]
          </p>
          <p className="text-muted-foreground">
            Based on Kuwait Labor Law. Calculation is automatic and updates when employees'
            service duration or salary changes.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
