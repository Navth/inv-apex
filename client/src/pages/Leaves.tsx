import { useState, useEffect } from "react";
import LeaveRequestForm from "@/components/LeaveRequestForm";
import LeaveRequestsTable from "@/components/LeaveRequestsTable";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ComingSoon from "@/components/ui/coming-soon";

// interface LeaveRecord {
//   id: number;
//   emp_id: string;
//   leave_type: string;
//   start_date: string;
//   end_date: string;
//   days: number;
//   reason: string;
//   status: "Pending" | "Approved" | "Rejected";
//   submitted_at: string;
//   reviewed_at: string | null;
//   reviewed_by: string | null;
// }

// export default function Leaves() {
//   const [requests, setRequests] = useState<LeaveRecord[]>([]);
//   const [employees, setEmployees] = useState<Record<string, { name: string }>>({});
//   const [isDialogOpen, setIsDialogOpen] = useState(false);
//   const [selectedRequest, setSelectedRequest] = useState<any>(null);

//   async function loadLeaves(status?: string) {
//     try {
//       const url = status ? `/api/leaves?status=${encodeURIComponent(status)}` : "/api/leaves";
//       const res = await fetch(url, { credentials: "include" });
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setRequests(Array.isArray(data) ? data : []);
//     } catch (err) {
//     }
//   }

//   useEffect(() => {
//     loadLeaves();
//     // Load employees for name mapping
//     (async () => {
//       try {
//         const res = await fetch("/api/employees", { credentials: "include" });
//         const list = res.ok ? await res.json() : [];
//         const map: Record<string, { name: string }> = {};
//         (list || []).forEach((e: any) => { map[e.emp_id] = { name: e.name }; });
//         setEmployees(map);
//       } catch (err) {
//       }
//     })();
//   }, []);

//   const handleApprove = async (id: number) => {
//     try {
//       const res = await fetch(`/api/leaves/${id}/approve`, { method: "PATCH", credentials: "include" });
//       if (!res.ok) throw new Error(await res.text());
//       await loadLeaves();
//     } catch (err) {
//       alert("Approve failed");
//     }
//   };

//   const handleReject = async (id: number) => {
//     try {
//       const res = await fetch(`/api/leaves/${id}/reject`, { method: "PATCH", credentials: "include" });
//       if (!res.ok) throw new Error(await res.text());
//       await loadLeaves();
//     } catch (err) {
//       alert("Reject failed");
//     }
//   };

//   const handleView = (request: any) => {
//     setSelectedRequest(request);
//   };

//   const handleSubmit = async (data: any) => {
//     // Basic mapping; emp_id would come from auth/user context (hard-coded for now)
//     const start = new Date(data.startDate);
//     const end = new Date(data.endDate);
//     const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
//     const payload = {
//       emp_id: "EMP-001", // TODO: replace with logged-in user
//       leave_type: data.leaveType,
//       start_date: start.toISOString().split("T")[0],
//       end_date: end.toISOString().split("T")[0],
//       days,
//       reason: data.reason,
//       status: "Pending",
//     };
//     try {
//       const res = await fetch("/api/leaves", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         credentials: "include",
//         body: JSON.stringify(payload),
//       });
//       if (!res.ok) throw new Error(await res.text());
//       await loadLeaves();
//       setIsDialogOpen(false);
//     } catch (err) {
//       alert("Create leave failed");
//     }
//   };

//   const pendingRequests = requests.filter(r => r.status === "Pending");
//   const approvedRequests = requests.filter(r => r.status === "Approved");
//   const rejectedRequests = requests.filter(r => r.status === "Rejected");

//   // Map to table's expected shape
//   const toTableRows = (items: LeaveRecord[]) =>
//     items.map((r) => ({
//       id: String(r.id),
//       emp_id: r.emp_id,
//       emp_name: employees[r.emp_id]?.name || r.emp_id,
//       leave_type: r.leave_type,
//       start_date: r.start_date,
//       end_date: r.end_date,
//       days: r.days,
//       reason: r.reason,
//       status: r.status,
//       submitted_at: r.submitted_at,
//     }));

 // return (
    // <div className="space-y-6">
    //   <div className="flex justify-between items-center">
    //     <div>
    //       <h1 className="text-3xl font-semibold mb-2">Leave Management</h1>
    //       <p className="text-muted-foreground">
    //         Manage employee leave requests and approvals
    //       </p>
    //     </div>
    //     <Button
    //       onClick={() => setIsDialogOpen(true)}
    //       data-testid="button-new-leave-request"
    //     >
    //       <Plus className="h-4 w-4 mr-2" />
    //       New Leave Request
    //     </Button>
    //   </div>

    //   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    //     <Card>
    //       <CardHeader className="pb-3">
    //         <CardTitle className="text-sm font-medium text-muted-foreground">
    //           Pending Requests
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="text-3xl font-bold">{pendingRequests.length}</div>
    //       </CardContent>
    //     </Card>
    //     <Card>
    //       <CardHeader className="pb-3">
    //         <CardTitle className="text-sm font-medium text-muted-foreground">
    //           Approved This Month
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="text-3xl font-bold">{approvedRequests.length}</div>
    //       </CardContent>
    //     </Card>
    //     <Card>
    //       <CardHeader className="pb-3">
    //         <CardTitle className="text-sm font-medium text-muted-foreground">
    //           Total Days Requested
    //         </CardTitle>
    //       </CardHeader>
    //       <CardContent>
    //         <div className="text-3xl font-bold">{requests.reduce((acc, r) => acc + r.days, 0)}</div>
    //       </CardContent>
    //     </Card>
    //   </div>

    //   <Tabs defaultValue="all" className="space-y-4">
    //     <TabsList>
    //       <TabsTrigger value="all" data-testid="tab-all-leaves">
    //         All Requests ({requests.length})
    //       </TabsTrigger>
    //       <TabsTrigger value="pending" data-testid="tab-pending-leaves">
    //         Pending ({pendingRequests.length})
    //       </TabsTrigger>
    //       <TabsTrigger value="approved" data-testid="tab-approved-leaves">
    //         Approved ({approvedRequests.length})
    //       </TabsTrigger>
    //       <TabsTrigger value="rejected" data-testid="tab-rejected-leaves">
    //         Rejected ({rejectedRequests.length})
    //       </TabsTrigger>
    //     </TabsList>

    //     <TabsContent value="all">
    //       <LeaveRequestsTable
    //         requests={toTableRows(requests)}
    //         onApprove={(id) => handleApprove(parseInt(id, 10))}
    //         onReject={(id) => handleReject(parseInt(id, 10))}
    //         onView={handleView}
    //       />
    //     </TabsContent>

    //     <TabsContent value="pending">
    //       <LeaveRequestsTable
    //         requests={toTableRows(pendingRequests)}
    //         onApprove={(id) => handleApprove(parseInt(id, 10))}
    //         onReject={(id) => handleReject(parseInt(id, 10))}
    //         onView={handleView}
    //       />
    //     </TabsContent>

    //     <TabsContent value="approved">
    //       <LeaveRequestsTable
    //         requests={toTableRows(approvedRequests)}
    //         onApprove={(id) => handleApprove(parseInt(id, 10))}
    //         onReject={(id) => handleReject(parseInt(id, 10))}
    //         onView={handleView}
    //       />
    //     </TabsContent>

    //     <TabsContent value="rejected">
    //       <LeaveRequestsTable
    //         requests={toTableRows(rejectedRequests)}
    //         onApprove={(id) => handleApprove(parseInt(id, 10))}
    //         onReject={(id) => handleReject(parseInt(id, 10))}
    //         onView={handleView}
    //       />
    //     </TabsContent>
    //   </Tabs>

    //   <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
    //     <DialogContent className="max-w-2xl">
    //       <DialogHeader>
    //         <DialogTitle>New Leave Request</DialogTitle>
    //         <DialogDescription>
    //           Submit a new leave request for approval
    //         </DialogDescription>
    //       </DialogHeader>
    //       <LeaveRequestForm
    //         onSubmit={handleSubmit}
    //         onCancel={() => setIsDialogOpen(false)}
    //       />
    //     </DialogContent>
    //   </Dialog>

    //   {selectedRequest && (
    //     <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
    //       <DialogContent className="max-w-2xl">
    //         <DialogHeader>
    //           <DialogTitle>Leave Request Details</DialogTitle>
    //         </DialogHeader>
    //         <div className="space-y-4">
    //           <div className="grid grid-cols-2 gap-4">
    //             <div>
    //               <p className="text-sm text-muted-foreground">Request ID</p>
    //               <p className="font-mono font-medium">{selectedRequest.id}</p>
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Employee</p>
    //               <p className="font-medium">{selectedRequest.emp_name}</p>
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Leave Type</p>
    //               <p className="font-medium capitalize">{selectedRequest.leave_type.replace('_', ' ')}</p>
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Duration</p>
    //               <p className="font-medium">{selectedRequest.days} days</p>
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">Start Date</p>
    //               <p className="font-medium">{selectedRequest.start_date}</p>
    //             </div>
    //             <div>
    //               <p className="text-sm text-muted-foreground">End Date</p>
    //               <p className="font-medium">{selectedRequest.end_date}</p>
    //             </div>
    //           </div>
    //           <div>
    //             <p className="text-sm text-muted-foreground mb-2">Reason</p>
    //             <p className="text-sm border rounded-lg p-3 bg-muted/30">{selectedRequest.reason}</p>
    //           </div>
    //         </div>
    //       </DialogContent>
    //     </Dialog>
    //   )}
    // </div>
  // );
// }

export default function Leaves() {
  return (
    <ComingSoon />
  );
}
