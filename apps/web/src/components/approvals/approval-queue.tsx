'use client';

import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ClipboardCheck, FileText, Loader2, Send, ThumbsDown, ThumbsUp, XCircle } from 'lucide-react';
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
import { useAuth } from '@/components/auth/auth-provider';
import {
  approveApproval,
  fetchMyApprovalQueue,
  rejectApproval,
  type ApprovalQueueItem,
  type ApprovalTimelineStep,
} from '@/lib/approval-api';
import { getApiErrorMessage } from '@/lib/api-error';
import { getStatusLabel } from '@/lib/purchase-request-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

const approvalQueueQueryKey = ['approvals', 'my-queue'] as const;
const allFilter = 'All';
const statusFilters = [allFilter, 'Submitted', 'Approved', 'Rejected'] as const;
const approvalRoles = ['ADMIN', 'MANAGER', 'FINANCE'];

export function ApprovalQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState('');
  const [statusFilter, setStatusFilter] = useState<(typeof statusFilters)[number]>(allFilter);
  const [departmentFilter, setDepartmentFilter] = useState(allFilter);
  const [rejectTarget, setRejectTarget] = useState<ApprovalQueueItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const queueQuery = useQuery({
    queryKey: approvalQueueQueryKey,
    queryFn: fetchMyApprovalQueue,
  });

  const requests = useMemo(() => queueQuery.data ?? [], [queueQuery.data]);
  const canReview = user?.roles.some((role) => approvalRoles.includes(role)) ?? false;

  const departmentFilters = useMemo(
    () => [allFilter, ...Array.from(new Set(requests.map((request) => request.purchaseRequest.department.name).filter(Boolean))).sort()],
    [requests],
  );

  const filteredRequests = useMemo(
    () =>
      requests.filter((request) => {
        const statusLabel = getStatusLabel(request.status);
        const matchesStatus = statusFilter === allFilter ? true : statusLabel === statusFilter;
        const matchesDepartment =
          departmentFilter === allFilter ? true : request.purchaseRequest.department.name === departmentFilter;
        return matchesStatus && matchesDepartment;
      }),
    [departmentFilter, requests, statusFilter],
  );

  useEffect(() => {
    if (!filteredRequests.length) {
      setSelectedId('');
      return;
    }

    if (!filteredRequests.some((request) => request.id === selectedId)) {
      setSelectedId(filteredRequests[0].id);
    }
  }, [filteredRequests, selectedId]);

  const selectedRequest = filteredRequests.find((request) => request.id === selectedId) ?? filteredRequests[0] ?? null;
  const pendingCount = requests.filter((request) => request.status === 'SUBMITTED').length;
  const approvedCount = requests.filter((request) => request.status === 'APPROVED').length;
  const rejectedCount = requests.filter((request) => request.status === 'REJECTED').length;

  const approveMutation = useMutation({
    mutationFn: approveApproval,
    onSuccess: (approval) => {
      updateCachedApproval(queryClient, approval);
      setSelectedId(approval.id);
      void queryClient.invalidateQueries({ queryKey: approvalQueueQueryKey });
      showSuccessToast('Purchase request approved.');
    },
    onError: (error) => {
      showErrorToast(error, 'Approval failed. Please try again.');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectApproval(id, reason),
    onSuccess: (approval) => {
      updateCachedApproval(queryClient, approval);
      setSelectedId(approval.id);
      setRejectTarget(null);
      setRejectReason('');
      void queryClient.invalidateQueries({ queryKey: approvalQueueQueryKey });
      showSuccessToast('Purchase request rejected.');
    },
    onError: (error) => {
      showErrorToast(error, 'Rejection failed. Please try again.');
    },
  });

  function openRejectModal(request: ApprovalQueueItem) {
    setRejectTarget(request);
    setRejectReason('');
  }

  function confirmReject() {
    if (!rejectTarget || rejectReason.trim().length < 3) {
      return;
    }

    rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Approval Queue</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Review submitted purchase requests, inspect approval history, and make manager or finance decisions.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Pending Review" value={String(pendingCount)} caption="Submitted and waiting approval" icon={ClipboardCheck} />
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
                <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as (typeof statusFilters)[number])}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusFilters.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status === allFilter ? 'All Status' : status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full sm:w-[230px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentFilters.map((department) => (
                      <SelectItem key={department} value={department}>
                        {department === allFilter ? 'All Departments' : department}
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
                  {queueQuery.isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading approval queue...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {queueQuery.isError ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-red-600">
                        {getApiErrorMessage(queueQuery.error, 'Unable to load approval queue.')}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {!queueQuery.isLoading && !queueQuery.isError
                    ? filteredRequests.map((request) => (
                        <TableRow
                          key={request.id}
                          className={selectedRequest?.id === request.id ? 'bg-blue-50/70' : undefined}
                          onClick={() => setSelectedId(request.id)}
                        >
                          <TableCell>
                            <div className="font-medium text-slate-900">{request.purchaseRequest.requestNumber}</div>
                            <div className="text-xs text-slate-500">{request.purchaseRequest.title}</div>
                          </TableCell>
                          <TableCell>{request.purchaseRequest.requester.fullName}</TableCell>
                          <TableCell>{request.purchaseRequest.department.name}</TableCell>
                          <TableCell>
                            <StatusBadge status={getStatusLabel(request.status) as WorkflowStatus} />
                          </TableCell>
                          <TableCell>{formatDateTime(request.purchaseRequest.submittedAt)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(request.purchaseRequest.totalAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    : null}
                  {!queueQuery.isLoading && !queueQuery.isError && !filteredRequests.length ? (
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
            showActions={canReview && selectedRequest.canAct}
            isApproving={approveMutation.isPending && approveMutation.variables === selectedRequest.id}
            isRejecting={rejectMutation.isPending && rejectMutation.variables?.id === selectedRequest.id}
            onApprove={() => approveMutation.mutate(selectedRequest.id)}
            onReject={() => openRejectModal(selectedRequest)}
          />
        ) : (
          <Card>
            <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
              {queueQuery.isLoading ? 'Loading purchase request detail...' : 'Select an approval request to view detail.'}
            </CardContent>
          </Card>
        )}
      </section>

      <RejectReasonDialog
        request={rejectTarget}
        reason={rejectReason}
        isSubmitting={rejectMutation.isPending}
        onReasonChange={setRejectReason}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={confirmReject}
      />
    </div>
  );
}

function PurchaseRequestApprovalDetail({
  request,
  showActions,
  isApproving,
  isRejecting,
  onApprove,
  onReject,
}: {
  request: ApprovalQueueItem;
  showActions: boolean;
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const purchaseRequest = request.purchaseRequest;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{purchaseRequest.requestNumber}</CardTitle>
            <CardDescription>{purchaseRequest.title}</CardDescription>
          </div>
          <StatusBadge status={getStatusLabel(request.status) as WorkflowStatus} />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          <DetailLine label="Requester" value={purchaseRequest.requester.fullName} />
          <DetailLine label="Department" value={purchaseRequest.department.name} />
          <DetailLine label="Total Amount" value={formatCurrency(purchaseRequest.totalAmount)} />
          <DetailLine label="Submitted Date" value={formatDateTime(purchaseRequest.submittedAt)} />
          <DetailLine label="Budget" value={purchaseRequest.budget?.code ?? '-'} />
          <DetailLine label="Priority" value={purchaseRequest.priority} />
        </div>

        <div className="rounded-lg border bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
            <FileText className="h-4 w-4" />
            Request Reason
          </div>
          <p className="mt-2 text-sm text-slate-600">{purchaseRequest.description || 'No reason provided.'}</p>
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
                {purchaseRequest.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
                {!purchaseRequest.items.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-slate-500">
                      No items were added to this request.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </div>

        <ApprovalTimeline steps={request.timeline} />

        {showActions ? (
          <div className="flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={isApproving || isRejecting} onClick={onReject}>
              {isRejecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsDown className="h-4 w-4" />}
              Reject
            </Button>
            <Button disabled={isApproving || isRejecting} onClick={onApprove}>
              {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />}
              Approve
            </Button>
          </div>
        ) : null}
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
                {step.date ? ` - ${formatDateTime(step.date)}` : ''}
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
  isSubmitting,
  onReasonChange,
  onOpenChange,
  onConfirm,
}: {
  request: ApprovalQueueItem | null;
  reason: string;
  isSubmitting: boolean;
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
            {request
              ? `Provide a reason for rejecting ${request.purchaseRequest.requestNumber}.`
              : 'Provide a rejection reason.'}
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
            <Button variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </DialogClose>
          <Button variant="destructive" disabled={isSubmitting || reason.trim().length < 3} onClick={onConfirm}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
    status === 'COMPLETED'
      ? 'bg-emerald-600'
      : status === 'REJECTED'
        ? 'bg-red-600'
        : status === 'PENDING'
          ? 'bg-amber-500'
          : 'bg-slate-300';

  return <div className={`h-3 w-3 rounded-full ${className}`} />;
}

function TimelineBadge({ status }: { status: ApprovalTimelineStep['status'] }) {
  if (status === 'COMPLETED') {
    return <Badge variant="green">Completed</Badge>;
  }

  if (status === 'REJECTED') {
    return <Badge variant="red">Rejected</Badge>;
  }

  if (status === 'PENDING') {
    return <Badge variant="amber">Pending</Badge>;
  }

  return <Badge variant="slate">Waiting</Badge>;
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function updateCachedApproval(
  queryClient: ReturnType<typeof useQueryClient>,
  approval: ApprovalQueueItem,
) {
  queryClient.setQueryData<ApprovalQueueItem[]>(approvalQueueQueryKey, (current) => {
    if (!current) {
      return [approval];
    }

    if (!current.some((item) => item.id === approval.id)) {
      return [approval, ...current];
    }

    return current.map((item) => (item.id === approval.id ? approval : item));
  });
}
