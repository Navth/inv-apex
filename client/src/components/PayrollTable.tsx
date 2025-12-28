import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Download } from "lucide-react";
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

interface PayrollRow {
  emp_id: string;
  name? : string;
  month?: string;
  basic_salary: number;
  ot_amount: number;
  food_allowance: number;
  gross_salary: number;
  deductions: number;
  net_salary: number;
  comment?: string;
  days_worked?: number;
}

interface PayrollTableProps {
  data: PayrollRow[];
  onSave?: (data: PayrollRow[]) => void;
  onApprove?: (data: PayrollRow[]) => void;
}

const toNumber = (value: any, fallback = 0): number => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};

export default function PayrollTable({ data, onSave, onApprove }: PayrollTableProps) {
  const [payrollData, setPayrollData] = useState<PayrollRow[]>(data);
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; field: string } | null>(null);

  useEffect(() => {
    setPayrollData(data);
  }, [data]);

  // Allow editing deductions and food_allowance, recalculate net salary on changes
  const updateCell = (rowIndex: number, field: keyof PayrollRow, value: any) => {
    if (field !== "deductions" && field !== "food_allowance" && field !== "comment") return;

    setPayrollData((prev) => {
      const newData = [...prev];
      const updated = { ...newData[rowIndex] };

      const numericValue = toNumber(value);

      if (field === "deductions") {
        updated.deductions = numericValue;
      } else if (field === "food_allowance") {
        updated.food_allowance = numericValue;
      } else {
        updated.comment = String(value);
      }

      // Recalculate net salary = gross_salary - deductions, update gross_salary if food_allowance changed
      if (field === "food_allowance") {
        updated.gross_salary = toNumber(updated.basic_salary) + toNumber(updated.ot_amount) + numericValue;
      }
      updated.net_salary = toNumber(updated.gross_salary) - toNumber(updated.deductions);

      newData[rowIndex] = updated;
      return newData;
    });
  };

  const formatCurrency = (value: number) => currencyFormatter.format(value || 0);
const handleSave = () => {
  if (!onSave) return;

  const normalized = payrollData.map((row) => ({
    ...row,
    basic_salary: toNumber(row.basic_salary),
    ot_amount: toNumber(row.ot_amount),
    food_allowance: toNumber(row.food_allowance),
    gross_salary: toNumber(row.gross_salary),
    deductions: toNumber(row.deductions),
    net_salary: toNumber(row.net_salary),
  }));

  onSave(normalized);
};
  const handleApprove = () => {
    onApprove?.(payrollData);
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10">
            <TableRow>
              <TableHead className="font-semibold sticky left-0 bg-muted/50 z-20 w-24">Emp ID</TableHead>
               <TableHead className="font-semibold min-w-32">Employee Name</TableHead>
              <TableHead className="font-semibold">Days Worked</TableHead>
              <TableHead className="font-semibold">Basic Salary</TableHead>
              <TableHead className="font-semibold">OT Amount</TableHead>
              <TableHead className="font-semibold">Food Allowance</TableHead>
              <TableHead className="font-semibold">Gross Salary</TableHead>
              <TableHead className="font-semibold">Deductions</TableHead>
              <TableHead className="font-semibold">Net Salary</TableHead>
              <TableHead className="min-w-48 font-semibold">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payrollData.map((row, rowIndex) => (
              <TableRow
                key={row.emp_id + (row.month ?? "")}
                className="hover-elevate"
                data-testid={`row-payroll-${row.emp_id}`}
              >
                <TableCell className="font-mono text-sm sticky left-0 bg-background font-semibold">
                  {row.emp_id}
                </TableCell>
                 <TableCell>{row.name ?? "-"}</TableCell>

                {/* Days Worked */}
                <TableCell className="text-center font-mono bg-muted/30 font-semibold">
                  {toNumber(row.days_worked, 0)}
                </TableCell>

                {/* Basic Salary (Read-only) */}
                <TableCell>
                  <Input
                    type="number"
                    value={toNumber(row.basic_salary).toFixed(2)}
                    readOnly
                    className="w-32 bg-muted/40 cursor-not-allowed text-sm"
                    title="Prorated basic salary based on attendance"
                  />
                </TableCell>

                {/* OT Amount (Read-only) */}
                <TableCell>
                  <Input
                    type="number"
                    value={toNumber(row.ot_amount).toFixed(2)}
                    readOnly
                    className="w-32 bg-muted/40 cursor-not-allowed text-sm"
                  />
                </TableCell>

                {/* Food Allowance (Editable) */}
                <TableCell>
                  <Input
                    type="number"
                    value={toNumber(row.food_allowance).toFixed(2)}
                    onChange={(e) => updateCell(rowIndex, "food_allowance", e.target.value)}
                    className="w-32 text-sm font-semibold border-2 border-blue-400 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                  />
                </TableCell>

                {/* Gross Salary (Read-only) */}
                <TableCell>
                  <Input
                    type="number"
                    value={toNumber(row.gross_salary).toFixed(2)}
                    readOnly
                    className="w-32 bg-blue-50 cursor-not-allowed text-sm font-semibold"
                    title="Basic + OT + Food Allowance"
                  />
                </TableCell>

                {/* Deductions (Editable) */}
                <TableCell>
                  <Input
                    type="number"
                    value={toNumber(row.deductions).toFixed(2)}
                    onChange={(e) => updateCell(rowIndex, "deductions", e.target.value)}
                    className="w-32 text-sm font-semibold border-2 border-orange-300 focus:border-orange-400"
                    placeholder="0.00"
                    step="0.01"
                  />
                </TableCell>

                {/* Net Salary (Read-only) */}
                <TableCell className="font-mono font-semibold text-green-600 text-right">
                  {formatCurrency(toNumber(row.net_salary))}
                </TableCell>

                {/* Comments */}
                <TableCell>
                  {editingCell?.rowIndex === rowIndex && editingCell.field === "comment" ? (
                    <Textarea
                      value={row.comment ?? ""}
                      onChange={(e) => updateCell(rowIndex, "comment", e.target.value)}
                      onBlur={() => setEditingCell(null)}
                      autoFocus
                      className="min-h-16 text-sm"
                    />
                  ) : (
                    <div
                      className="cursor-pointer hover-elevate active-elevate-2 px-2 py-1 rounded min-h-8 flex items-center gap-2"
                      onClick={() => setEditingCell({ rowIndex, field: "comment" })}
                    >
                      <span className="text-sm flex-1 text-muted-foreground">
                        {row.comment || "Add comment..."}
                      </span>
                      <Pencil className="h-3 w-3 text-muted-foreground" />
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

   <div className="flex justify-end gap-2 pt-4 border-t">
  {onSave && (
    <Button
      variant="outline"
      onClick={handleSave}
      data-testid="button-save-payroll"
    >
      Save Changes
    </Button>
  )}
  <Button onClick={handleApprove} data-testid="button-approve-payroll">
    <Download className="h-4 w-4 mr-2" />
    Download File
  </Button>
</div>

    </div>
  );
}
