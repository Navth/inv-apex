import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { employeesApi } from "@/api/employees";
import { payrollApi } from "@/api/payroll";
import { attendanceApi } from "@/api/attendance";

interface StatsCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
}

function StatsCard({ title, value, icon, trend }: StatsCardProps) {
 

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="text-muted-foreground">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {trend && <p className="text-xs text-muted-foreground mt-1">{trend}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardStats() {
  const [stats, setStats] = useState({
    employees: 0,
    payroll: 0,
    departments: 0,
    attendanceRate: "0%",
  });

  const getCurrentMonth = () => {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const year = now.getFullYear();
    return `${month}-${year}`;
  };

  useEffect(() => {
    async function fetchStats() {
      const currentMonth = getCurrentMonth();

      try {
        // Fetch all employees
        const employees = await employeesApi.getAll();

        // Monthly payroll for current month
        const payrollData = await payrollApi.getAll(currentMonth);
        const payrollSum = payrollData.reduce(
          (sum: number, row: any) => sum + Number(row.net_salary || 0),
          0,
        );

        // Distinct departments from employees (schema has department)
        const departments = Array.from(
          new Set((employees || []).map((e: any) => e.department).filter(Boolean)),
        ).length;

        // Attendance for current month to compute rate
        const attendance = await attendanceApi.getAll(currentMonth);
        let totalPresent = 0;
        let totalWorking = 0;
        (attendance || []).forEach((a: any) => {
          totalPresent += Number(a.present_days || 0);
          totalWorking += Number(a.working_days || 0);
        });
        const attendanceRate =
          totalWorking > 0 ? ((totalPresent / totalWorking) * 100).toFixed(1) + "%" : "0%";

        setStats({
          employees: employees?.length || 0,
          payroll: payrollSum,
          departments,
          attendanceRate,
        });
      } catch (err) {
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Total Employees"
        value={stats.employees.toString()}
        icon={<Users className="h-4 w-4" />}
        trend="" // You can add real trends if you implement
      />
      <StatsCard
        title="Monthly Payroll"
        value={`₹${stats.payroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
        icon={<DollarSign className="h-4 w-4" />}
        trend=""
      />
      <StatsCard
        title="Departments"
        value={stats.departments.toString()}
        icon={<TrendingUp className="h-4 w-4" />}
        trend=""
      />
      <StatsCard
        title="Attendance Rate"
        value={stats.attendanceRate}
        icon={<Calendar className="h-4 w-4" />}
        trend=""
      />
    </div>

  );
}
