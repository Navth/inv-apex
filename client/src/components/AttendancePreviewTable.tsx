import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle } from "lucide-react";
import type { AttendanceRecord } from "@/types/attendance";
import { useMemo } from "react";
import { object } from "zod";

export type AttendancePreviewTableProps = {
  records: AttendanceRecord[];
  onChange: (index: number, patch: Partial<AttendanceRecord>) => void;
};

export function AttendancePreviewTable({ records, onChange }: AttendancePreviewTableProps) {
  const { validCount, errorCount, errors } = useMemo(() => {
    const v = records.filter((r) => r.isValid).length;
    const e = records.length - v;
    const errorTypes: Record<string, number> = {};

    records.forEach(r => {
      if(!r.isValid && r.error){
        errorTypes[r.error] = (errorTypes[r.error] || 0) + 1;
      }
    });
    return { validCount: v, errorCount: e , errors: errorTypes};
  }, [records]);

  return (
    <div className="space-y-4">
      {records.length > 0 && (
        <Alert>
          <AlertDescription className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-medium">{validCount} valid records</span>
              {errorCount > 0 && (
                <>
                  <AlertCircle className="h-4 w-4 text-destructive ml-4" />
                  <span className="font-medium text-destructive">{errorCount} errors found</span>
                </>
              )}
            </div>
            {
              errorCount > 0 && (
                <div className="text-sm text-muted-foreground ml-6">
                  {Object.entries(errors).map(([error, count]) => (
                    <div key={error}>• {error}: {count} record(s)</div>
                  ))}             
                </div>
                )
            }
          </AlertDescription>
        </Alert>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50">
            <TableRow>
              <TableHead className="font-semibold">Emp ID</TableHead>
              <TableHead className="font-semibold text-right">Total Working Days</TableHead>
              <TableHead className="font-semibold text-right">Worked Days</TableHead>
              <TableHead className="font-semibold text-right">Normal OT</TableHead>
              <TableHead className="font-semibold text-right">Friday OT</TableHead>
              <TableHead className="font-semibold text-right">Holiday OT</TableHead>
              <TableHead className="font-semibold text-right">Dues Earned</TableHead>
              <TableHead className="font-semibold text-right">Unpaid Days</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Comments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record, index) => {
              const workingDays = record.total_working_days ?? (Array.isArray(record.dailyStatus) ? record.dailyStatus.length : 30);
              const computedAbsent = Math.max(workingDays - Number(record.worked_days ?? 0), 0);

              return (
              <TableRow
                key={index}
                className={record.isValid ? "hover-elevate" : "bg-destructive/10"}
                data-testid={`row-attendance-${record.emp_id || index}`}
              >
                <TableCell className="font-mono text-sm">
                  <input
                    className="w-28 bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.emp_id}
                    onChange={(e) => onChange(index, { emp_id: e.target.value.trim(), isValid: Boolean(e.target.value.trim()) })}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    className="w-16 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.total_working_days ?? 30}
                    onChange={(e) => {
                      const nextWorking = Number(e.target.value || 0);
                      const nextAbsent = Math.max(nextWorking - Number(record.worked_days ?? 0), 0);
                      onChange(index, { total_working_days: nextWorking, unpaid_days: nextAbsent });
                    }}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    className="w-16 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.worked_days}
                    onChange={(e) => {
                      const nextWorked = Number(e.target.value || 0);
                      const nextAbsent = Math.max(workingDays - nextWorked, 0);
                      onChange(index, { worked_days: nextWorked, unpaid_days: nextAbsent });
                    }}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="w-16 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.normal_ot}
                    onChange={(e) => onChange(index, { normal_ot: Number(e.target.value || 0) })}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="w-16 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.friday_ot}
                    onChange={(e) => onChange(index, { friday_ot: Number(e.target.value || 0) })}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="w-16 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.holiday_ot}
                    onChange={(e) => onChange(index, { holiday_ot: Number(e.target.value || 0) })}
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  <input
                    type="number"
                    step="0.01"
                    className="w-20 text-right bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.dues_earned ?? 0}
                    onChange={(e) => onChange(index, { dues_earned: Number(e.target.value || 0) })}
                    placeholder="0"
                  />
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {computedAbsent}
                </TableCell>
                <TableCell>
                  {record.isValid ? (
                    <span className="text-green-600 text-sm flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Valid
                    </span>
                  ) : (
                    <span className="text-destructive text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      {record.error || "Invalid"}
                    </span>
                  )}
                </TableCell>
                <TableCell className="whitespace-pre-wrap text-sm">
                  <input
                    className="w-full bg-transparent outline-none border-b border-muted-foreground/30 focus:border-primary"
                    value={record.comments || ""}
                    onChange={(e) => onChange(index, { comments: e.target.value })}
                  />
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
