import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Search } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "KWD",
  minimumFractionDigits: 2,
});

interface EmployeeRow {
  emp_id: string;
  name: string;
  designation: string;
  department: string;
  category: string;
  civil_id?: string | null;
  doj: string;
  internal_department_doj?: string | null;
  five_year_calc_date?: string | null;
  basic_salary: number;
  food_allowance_type: "per_day" | "fixed" | "none";
  food_allowance_amount: number;
  other_allowance: number;
  working_hours: number;
  indemnity_rate: number;
}

interface EmployeeTableProps {
  employees: EmployeeRow[];
  onEdit?: (employee: EmployeeRow) => void;
  onDelete?: (empId: string) => void;
}

export default function EmployeeTable({ employees, onEdit, onDelete }: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const normalizedQuery = searchTerm.toLowerCase();
  const filteredEmployees = employees.filter((emp) => {
    const fields = [
      emp.name,
      emp.emp_id,
      emp.department,
      emp.civil_id || "",
      emp.category || "",
    ];
    return fields.some((field) => field.toLowerCase().includes(normalizedQuery));
  });

  const formatCurrency = (value: number) => currencyFormatter.format(value || 0);
  const formatDate = (value?: string | null) => (value ? value : "-");
  const formatFoodAllowance = (employee: EmployeeRow) => {
    if (employee.food_allowance_type === "none") return "-";
    const label = employee.food_allowance_type === "per_day" ? "Per Day" : "Fixed";
    return `${label} ${formatCurrency(employee.food_allowance_amount)}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
            data-testid="input-search-employees"
          />
        </div>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Emp ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Designation</TableHead>
              <TableHead className="font-semibold">Civil ID</TableHead>
              <TableHead className="font-semibold">Department</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold text-right">Monthly Salary</TableHead>
              <TableHead className="font-semibold">Food Allowance</TableHead>
              <TableHead className="font-semibold text-right">Other Allowance</TableHead>
              <TableHead className="font-semibold">DOJ</TableHead>
              <TableHead className="font-semibold">DOJ (Internal)</TableHead>
              <TableHead className="font-semibold">5 Year Calc</TableHead>
              <TableHead className="font-semibold text-right">Working Hrs</TableHead>
              <TableHead className="font-semibold text-right">Indemnity @</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow
                key={employee.emp_id}
                className="hover-elevate"
                data-testid={`row-employee-${employee.emp_id}`}
              >
                <TableCell className="font-mono text-sm">{employee.emp_id}</TableCell>
                <TableCell className="font-medium">{employee.name}</TableCell>
                <TableCell className="text-sm">{employee.designation}</TableCell>
                <TableCell className="text-sm">{employee.civil_id || "-"}</TableCell>
                <TableCell className="text-sm">{employee.department}</TableCell>
                <TableCell className="text-sm">{employee.category}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(employee.basic_salary)}
                </TableCell>
                <TableCell className="text-sm">{formatFoodAllowance(employee)}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatCurrency(employee.other_allowance)}
                </TableCell>
                <TableCell className="text-sm">{employee.doj}</TableCell>
                <TableCell className="text-sm">{formatDate(employee.internal_department_doj)}</TableCell>
                <TableCell className="text-sm">{formatDate(employee.five_year_calc_date)}</TableCell>
                <TableCell className="text-right text-sm">{employee.working_hours || 0}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {employee.indemnity_rate ? formatCurrency(employee.indemnity_rate) : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onEdit?.(employee)}
                      data-testid={`button-edit-${employee.emp_id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => onDelete?.(employee.emp_id)}
                      data-testid={`button-delete-${employee.emp_id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No employees found
        </div>
      )}
    </div>
  );
}