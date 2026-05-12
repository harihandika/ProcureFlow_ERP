'use client';

import type React from 'react';
import { useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, FileText, Send, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
import { StatusBadge, type WorkflowStatus } from '@/components/status-badge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  approvalDepartments,
  approvalRequests,
  approvalStatuses,
  type ApprovalRequest,
  type ApprovalTimelineStep,
} from '@/lib/approval-data';
import { formatCurrency } from '@/lib/utils';

export function ApprovalQueue() {
  const [requests, setRequests] = useState(approvalRequests);
  const [selectedId, setSelectedId] = useState(approvalRequests[0]?.id ?? '');
  const [statusFilter, setStatusFilter] = useState<'All' | WorkflowStatus>('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [rejectTarget, setRejectTarget] = useState<ApprovalRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const matchesStatus = statusFilter === 'All' ? true : request.status === statusFilter;
        const matchesDepartment = departmentFilter === 'All' ? true : request.department === departmentFilter;
        return matchesStatus && matchesDepartment;
      }),
    [departmentFilter, requests, statusFilter],
  );

  const selectedRequest =
    requests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? requests[0] ?? null;
  const pendingCount = requests.filter((request) => request.status === 'Pending' || request.status === 'Submitted').length;
  const approvedCount = requests.filter((request) => request.status === 'Approved').length;
  const rejectedCount = requests.filter((request) => request.status === 'Rejected').length;

  function approveRequest(request: ApprovalRequest) {
    setRequests((current) =>
      current.map((item) =>
        item.id === request.id
          ? {
              ...item,
              status: 'Approved',
              timeline: item.timeline.map((step) =>
                step.status === 'Pending' || step.status === 'Waiting'
                  ? { ...step, status: 'Completed', date: step.date ?? '2026-05-12 14:30' }
                  : step,
              ),
            }
          : item,
      ),
    );
  }

  function rejectRequest() {
    if (!rejectTarget) {
      return;
    }

    setRequests((current) =>
      current.map((item) =>
        item.id === rejectTarget.id
          ? {
              ...item,
              status: 'Rejected',
              rejectReason: rejectReason || 'Rejected from approval queue.',
              timeline: item.timeline.map((step) =>
                step.status === 'Pending'
                  ? {
                      ...step,
                      status: 'Rejected',
                      date: '2026-05-12 14:30',
                      note: rejectReason || 'Rejected from approval queue.',
                    }
                  : step,
              ),
            }
          : item,
      ),
    );
    setRejectTarget(null);
    setRejectReason('');
  }

  function openRejectModal(request: ApprovalRequest) {
    setRejectTarget(request);
    setRejectReason('');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Approval Queue</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Review purchase requests, inspect approval history, and make manager or finance decisions using dummy data.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Pending Review" value={String(pendingCount)} caption="Submitted or waiting approval" icon={ClipboardCheck} />
        <SummaryCard label="Approved" value={String(approvedCount)} caption="Ready for purchasing" icon={CheckCircle2} />
        <SummaryCard label="Rejected" value={String(rejectedCount)} caption="Returned to requester" icon={XCircle} />
      </section>

      <section className="grid gap-4 2xl:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <CardTitle>Approval Queue List</CardTitle>
                <CardDescription>Filter by status and department.</CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'All' | WorkflowStatus)}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === 'All' ? 'All Status' : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[230px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {approvalDepartments.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department === 'All' ? 'All Departments' : department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[150px]">PR No</TableHead>
                    <TableHead className="min-w-[220px]">Requester</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow
                      key={request.id}
                      className={selectedRequest?.id === request.id ? 'bg-blue-50/70' : undefined}
                      onClick={() => setSelectedId(request.id)}
                    >
                      <TableCell>
                        <div className="font-medium text-slate-900">{request.prNo}</div>
                        <div className="text-xs text-slate-500">{request.title}</div>
                      </TableCell>
                      <TableCell>{request.requester}</TableCell>
                      <TableCell>{request.department}</TableCell>
                      <TableCell>
                        <StatusBadge status={request.status} />
                      </TableCell>
                      <TableCell>{request.submittedDate}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(request.totalAmount)}</TableCell>
                    </TableRow>
                  ))}
                  {!filteredRequests.length ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                        No approval requests match the filters.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {selectedRequest ? (
          <PurchaseRequestApprovalDetail
            request={selectedRequest}
            onApprove={() => approveRequest(selectedRequest)}
            onReject={() => openRejectModal(selectedRequest)}
          />
        ) : null}
      </section>

      <RejectReasonDialog
        request={rejectTarget}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={rejectRequest}
      />
    </div>
  );
}

function PurchaseRequestApprovalDetail({
  request,
  onApprove,
  onReject,
}: {
  request: ApprovalRequest;
  onApprove: () => void;
  onReject: () => void;
}) {
  const decisionDisabled = request.status === 'Approved' || request.status === 'Rejected';

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{request.prNo}</CardTitle>
            <CardDescription>{request.title}</CardDescription>
          </div>
          <StatusBadge status={request.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailLine label="Requester" value={request.requester} />
          <DetailLine label="Department" value={request.department} />
          <DetailLine label="Total Amount" value={formatCurrency(request.totalAmount)} />
          <DetailLine label="Submitted Date" value={request.submittedDate} />
          <DetailLine label="Budget" value={request.budgetCode} />
          <DetailLine label="Priority" value={request.priority} />
        </div>

        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <FileText className="h-4 w-4" />
            Request Reason
          </div>
          <p className="mt-2 text-sm text-slate-600">{request.reason}</p>
          {request.rejectReason ? <p className="mt-2 text-sm font-medium text-red-700">Rejected: {request.rejectReason}</p> : null}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-slate-950">Items</h3>
          <div className="mt-3 overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.map((item) => (
                  <TableRow key={`${request.id}-${item.sku}`}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        <ApprovalTimeline steps={request.timeline} />

        <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
          <Button variant="outline" disabled={decisionDisabled} onClick={onReject}>
            <ThumbsDown className="h-4 w-4" />
            Reject
          </Button>
          <Button disabled={decisionDisabled} onClick={onApprove}>
            <ThumbsUp className="h-4 w-4" />
            Approve
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalTimeline({ steps }: { steps: ApprovalTimelineStep[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-950">Approval Timeline</h3>
      <div className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <div key={`${step.label}-${index}`} className="flex gap-3">
            <div className="flex flex-col items-center">
              <TimelineDot status={step.status} />
              {index < steps.length - 1 ? <div className="mt-1 h-9 w-px bg-slate-200" /> : null}
            </div>
            <div className="-mt-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-medium text-slate-900">{step.label}</div>
                <TimelineBadge status={step.status} />
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {step.actor}
                {step.date ? ` - ${step.date}` : ''}
              </div>
              {step.note ? <div className="mt-1 text-xs text-red-700">{step.note}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RejectReasonDialog({
  request,
  reason,
  onReasonChange,
  onOpenChange,
  onConfirm,
}: {
  request: ApprovalRequest | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(request)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Purchase Request</DialogTitle>
          <DialogDescription>
            {request ? `Provide a reason for rejecting ${request.prNo}.` : 'Provide a rejection reason.'}
          </DialogDescription>
        </DialogHeader>
        <div>
          <Label htmlFor="rejectReason">Reject Reason</Label>
          <textarea
            id="rejectReason"
            value={reason}
            onChange={(event) => onReasonChange(event.target.value)}
            className="mt-2 min-h-28 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Explain why this request cannot be approved."
          />
        </div>
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button variant="destructive" onClick={onConfirm}>
            <Send className="h-4 w-4" />
            Submit Rejection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="rounded-md bg-blue-50 p-2 text-blue-800">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-2xl">{value}</CardTitle>
        <p className="mt-1 text-xs text-slate-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-white p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function TimelineDot({ status }: { status: ApprovalTimelineStep['status'] }) {
  const className =
    status === 'Completed'
      ? 'bg-emerald-600'
      : status === 'Rejected'
        ? 'bg-red-600'
        : status === 'Pending'
          ? 'bg-amber-500'
          : 'bg-slate-300';

  return <div className={`h-3 w-3 rounded-full ${className}`} />;
}

function TimelineBadge({ status }: { status: ApprovalTimelineStep['status'] }) {
  if (status === 'Completed') {
    return <Badge variant="green">Completed</Badge>;
  }

  if (status === 'Rejected') {
    return <Badge variant="red">Rejected</Badge>;
  }

  if (status === 'Pending') {
    return <Badge variant="amber">Pending</Badge>;
  }

  return <Badge variant="slate">Waiting</Badge>;
}
