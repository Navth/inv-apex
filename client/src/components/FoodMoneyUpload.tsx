import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { parseFoodMoneyFile, type FoodMoneyRecord } from "@/lib/foodMoneyParser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { foodMoneyApi } from "@/api/foodMoney";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function FoodMoneyUpload() {
  const [records, setRecords] = useState<FoodMoneyRecord[]>([]);
  const [fileName, setFileName] = useState("");
  const [sheetYear, setSheetYear] = useState(new Date().getFullYear());
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { fileName: name, records: parsed } = await parseFoodMoneyFile(file, sheetYear);
      setFileName(name);
      setRecords(parsed);
    } catch (err) {
      alert((err as Error).message || "Failed to parse file");
    }
  };

  const handleConfirm = async () => {
    if (records.length === 0) return;
    setIsUploading(true);
    try {
      const months = [...new Set(records.map((r) => r.month))];
      await foodMoneyApi.bulkUpload(records, months);
      alert(`Successfully uploaded ${records.length} food money record(s) for ${months.length} month(s).`);
      setRecords([]);
      setFileName("");
    } catch (err) {
      alert((err as Error).message || "Failed to save food money records");
    } finally {
      setIsUploading(false);
    }
  };

  const monthsInFile = [...new Set(records.map((r) => r.month))].sort();
  const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Upload Food Money Worksheet</CardTitle>
          <CardDescription>
            Import food money from the separate worksheet for employees who receive food money separately.
            Supports emp_id + month columns (Jan, Feb, 01-2025) or emp_id | month | amount format.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Year for month columns (Jan, Feb, etc.)</Label>
              <Select
                value={sheetYear.toString()}
                onValueChange={(v) => setSheetYear(parseInt(v))}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2023, 2024, 2025, 2026].map((y) => (
                    <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 cursor-pointer transition-colors">
                <input
                  type="file"
                  id="food-money-file"
                  className="hidden"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                />
                <label htmlFor="food-money-file" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">{fileName || "Click to upload Excel"}</p>
                  <p className="text-xs text-muted-foreground">Excel (.xlsx, .xls) or CSV</p>
                </label>
              </div>
            </div>
          </div>

          {records.length > 0 && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span>{records.length} records for {monthsInFile.length} month(s): {monthsInFile.join(", ")}</span>
                <span className="text-muted-foreground">| Total: {totalAmount.toFixed(2)} KWD</span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Review before saving. Existing records for these months will be replaced.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Emp ID</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead className="text-right">Amount (KWD)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.slice(0, 100).map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.emp_id}</TableCell>
                      <TableCell>{r.month}</TableCell>
                      <TableCell className="text-right">{r.amount.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {records.length > 100 && (
                <p className="text-sm text-muted-foreground py-2">… and {records.length - 100} more</p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => { setRecords([]); setFileName(""); }}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isUploading}>
                {isUploading ? "Saving…" : "Save Food Money"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
