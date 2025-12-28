import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LeaveRequest {
  id: string;
  emp_id: string;
  emp_name: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  submitted_at: string;
}

interface LeaveRequestsTableProps {
  requests: LeaveRequest[];
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onView?: (request: LeaveRequest) => void;
}

export default function LeaveRequestsTable({
  requests,
  onApprove,
  onReject,
  onView,
}: LeaveRequestsTableProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "default";
      case "Rejected":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/50">
          <TableRow>
            <TableHead className="font-semibold">Request ID</TableHead>
            <TableHead className="font-semibold">Employee</TableHead>
            <TableHead className="font-semibold">Leave Type</TableHead>
            <TableHead className="font-semibold">Start Date</TableHead>
            <TableHead className="font-semibold">End Date</TableHead>
            <TableHead className="font-semibold text-right">Days</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id} className="hover-elevate" data-testid={`row-leave-${request.id}`}>
              <TableCell className="font-mono text-sm">{request.id}</TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{request.emp_name}</div>
                  <div className="text-xs text-muted-foreground">{request.emp_id}</div>
                </div>
              </TableCell>
              <TableCell className="text-sm capitalize">{request.leave_type.replace('_', ' ')}</TableCell>
              <TableCell className="text-sm">{request.start_date}</TableCell>
              <TableCell className="text-sm">{request.end_date}</TableCell>
              <TableCell className="text-right font-mono text-sm">{request.days}</TableCell>
              <TableCell>
                <Badge variant={getStatusColor(request.status)}>
                  {request.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onView?.(request)}
                    data-testid={`button-view-${request.id}`}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {request.status === "Pending" && (
                    <>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onApprove?.(request.id)}
                        data-testid={`button-approve-${request.id}`}
                      >
                        <Check className="h-4 w-4 text-green-600" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => onReject?.(request.id)}
                        data-testid={`button-reject-${request.id}`}
                      >
                        <X className="h-4 w-4 text-destructive" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
