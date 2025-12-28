import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AttendancePreviewTable } from "@/components/AttendancePreviewTable";
import { parseAttendanceFile } from "@/lib/attendanceParser";
import type { AttendanceRecord } from "@/types/attendance";
// Note: We do not persist anything during upload; saving happens on Confirm.


// Record type now lives in '@/types/attendance'


interface AttendanceUploadProps {
  selectedMonth: string; // We need the selected month to assign records
  onUpload?: (records: AttendanceRecord[]) => void;
}


export default function AttendanceUpload({ selectedMonth, onUpload }: AttendanceUploadProps) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [fileName, setFileName] = useState("");   
  const [employees, setEmployees] = useState<Set<string>>(new Set());



  useEffect(() => {
    async function loadEmployees() {
      try{
        const res = await fetch("/api/employees", {credentials: "include"});
        if (res.ok) {
          const data = await res.json();
          setEmployees(new Set(data.map((e: any) => e.emp_id)));
      }
    }
    catch (err){
      console.error("Failed to load employees:", err);
    }
  }
  loadEmployees();
}
  ,[]);


  // No DB writes here; editing and saving happens after preview.


  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileName: name, records } = await parseAttendanceFile(file);
      // Validate records against existing employees
      const validatedRecords = records.map((record) => {
        if(!record.emp_id){
          return { ...record, isValid: false, error: "Missing Emp ID" };
        }
        if (!employees.has(record.emp_id)) {
          return {...record, isValid: false, error: "Emp ID not found" };
        }
        return { ...record, isValid: true };
      });
      setFileName(name);
      setRecords(validatedRecords);
    } catch (err) {
      alert((err as Error).message || "Failed to parse file");
    }
  };


  const handleConfirm = () => {
    const validRecords = records.filter((r) => r.isValid);
    onUpload?.(validRecords);
  };


  const validCount = records.filter((r) => r.isValid).length;
  const errorCount = records.filter((r) => !r.isValid).length;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Attendance</CardTitle>
          <CardDescription>Import attendance data from Excel or CSV file</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center hover-elevate active-elevate-2 cursor-pointer transition-colors">
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              data-testid="input-file-upload"
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">{fileName || "Click to upload or drag and drop"}</p>
              <p className="text-xs text-muted-foreground">
                Excel (.xlsx, .xls) or CSV files only
              </p>
            </label>
          </div>


          {records.length > 0 && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="font-medium">{validCount} valid records</span>
                {errorCount > 0 && (
                  <>
                    <AlertCircle className="h-4 w-4 text-destructive ml-4" />
                    <span className="font-medium text-destructive">{errorCount} errors found</span>
                  </>
                )}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>


      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review and edit attendance data before confirming</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendancePreviewTable
              records={records}
              onChange={(idx, patch) =>
                setRecords((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], ...patch } as AttendanceRecord;
                  if (!next[idx].emp_id) {
                    next[idx].isValid = false;
                    next[idx].error = "Missing Emp ID";
                  } else {
                    next[idx].isValid = true;
                    delete (next[idx] as any).error;
                  }
                  return next;
                })
              }
            />
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setRecords([])} data-testid="button-cancel-upload">
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={validCount === 0} data-testid="button-confirm-upload">
                Confirm & Save
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
