import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Pencil, DollarSign, Download } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

interface IndemnityRecord {
  emp_id: string;
  emp_name: string;
  designation: string;
  doj: string;
  years_of_service: number;
  basic_salary: number;
  indemnity_amount: number;
  status: "Active" | "Paid" | "Pending";
}

interface IndemnityTableProps {
  records: IndemnityRecord[];
  onPay?: (empId: string) => void;
  onEdit?: (record: IndemnityRecord) => void;
}

export default function IndemnityTable({ records, onPay, onEdit }: IndemnityTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "default";
      case "Paid":
        return "secondary";
      case "Pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "Active":
        return "default";
      case "Paid":
        return "secondary";
      case "Pending":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!records || records.length === 0) {
      alert("No indemnity data to export");
      return;
    }

    const excelData = records.map((record) => ({
      "Employee ID": record.emp_id,
      "Name": record.emp_name,
      "Designation": record.designation,
      "Date of Joining": record.doj,
      "Years of Service": record.years_of_service.toFixed(2),
      "Basic Salary (KWD)": parseFloat(record.basic_salary.toString()).toFixed(2),
      "Indemnity Amount (KWD)": parseFloat(record.indemnity_amount.toString()).toFixed(2),
      "Status": record.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Indemnity");

    // Set column widths
    worksheet["!cols"] = [
      { wch: 15 }, // Employee ID
      { wch: 25 }, // Name
      { wch: 20 }, // Designation
      { wch: 15 }, // DOJ
      { wch: 18 }, // Years of Service
      { wch: 18 }, // Basic Salary
      { wch: 20 }, // Indemnity Amount
      { wch: 12 }, // Status
    ];

    const filename = `Indemnity_Report_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  // Format currency as KWD
  const formatKWD = (amount: number) => {
    return amount.toLocaleString("en-US", {
      style: "currency",
      currency: "KWD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Format date nicely
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportExcel} data-testid="button-export-indemnity">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      <div className="border rounded-lg overflow-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/50 z-10">
            <TableRow>
              <TableHead className="font-semibold">Emp ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Designation</TableHead>
              <TableHead className="font-semibold">DOJ</TableHead>
              <TableHead className="font-semibold text-right">Years of Service</TableHead>
              <TableHead className="font-semibold text-right">Basic Salary</TableHead>
              <TableHead className="font-semibold text-right">Indemnity Amount</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  No indemnity records found
                </TableCell>
              </TableRow>
            ) : (
              records.map((record) => (
                <TableRow
                  key={record.emp_id}
                  className="hover-elevate"
                  data-testid={`row-indemnity-${record.emp_id}`}
                >
                  <TableCell className="font-mono text-sm">{record.emp_id}</TableCell>
                  <TableCell className="font-medium">{record.emp_name}</TableCell>
                  <TableCell className="text-sm">{record.designation}</TableCell>
                  <TableCell className="text-sm">{formatDate(record.doj)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {record.years_of_service.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatKWD(record.basic_salary)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold">
                    {formatKWD(record.indemnity_amount)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(record.status)}>{record.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onEdit?.(record)}
                        data-testid={`button-edit-indemnity-${record.emp_id}`}
                        title="Edit record"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {record.status === "Active" && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onPay?.(record.emp_id)}
                          data-testid={`button-pay-indemnity-${record.emp_id}`}
                          title="Mark as paid"
                        >
                          <DollarSign className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
