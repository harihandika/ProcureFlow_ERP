'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, RefreshCw, Search, Send, ServerCog } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchErpSyncLogs,
  getOperationLabel,
  retryErpSync,
  syncPurchaseOrderToErp,
  type ErpSyncLog,
  type ErpSyncStatus,
  type ErpSyncStatusLabel,
} from '@/lib/erp-sync-api';
import { fetchPurchaseOrders } from '@/lib/purchase-order-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

const allValue = 'All';
const statusOptions: Array<{ value: typeof allValue | Exclude<ErpSyncStatus, 'RETRYING'>; label: typeof allValue | ErpSyncStatusLabel }> = [
  { value: allValue, label: allValue },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUCCESS', label: 'Success' },
  { value: 'FAILED', label: 'Failed' },
];

const statusVariants: Record<ErpSyncStatusLabel, BadgeProps['variant']> = {
  Pending: 'amber',
  Success: 'green',
  Failed: 'red',
};

export function ErpSyncLogs() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]['value']>(allValue);
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [purchaseOrderId, setPurchaseOrderId] = useState('');

  const logsQuery = useQuery({
    queryKey: ['erp-sync', 'logs', { statusFilter, search }],
    queryFn: () =>
      fetchErpSyncLogs({
        page: 1,
        limit: 100,
        search,
        status: statusFilter === allValue ? undefined : statusFilter,
      }),
  });

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', 'erp-sync-options'],
    queryFn: () => fetchPurchaseOrders({ page: 1, limit: 100 }),
  });

  const logs = useMemo(() => logsQuery.data?.data ?? [], [logsQuery.data]);
  const purchaseOrders = useMemo(
    () => (purchaseOrdersQuery.data?.data ?? []).filter((order) => order.status !== 'CANCELLED'),
    [purchaseOrdersQuery.data],
  );

  useEffect(() => {
    if (!purchaseOrderId && purchaseOrders[0]) {
      setPurchaseOrderId(purchaseOrders[0].id);
    }
  }, [purchaseOrderId, purchaseOrders]);

  const filteredLogs = useMemo(
    () => logs.filter((log) => !dateFilter || log.createdAt.startsWith(dateFilter) || log.syncedAt?.startsWith(dateFilter)),
    [dateFilter, logs],
  );

  const syncMutation = useMutation({
    mutationFn: syncPurchaseOrderToErp,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['erp-sync'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      showSuccessToast('Purchase order sync submitted.');
    },
    onError: (error) => {
      showErrorToast(error, 'Unable to sync purchase order.');
    },
  });

  const retryMutation = useMutation({
    mutationFn: retryErpSync,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['erp-sync'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      showSuccessToast('ERP sync retry submitted.');
    },
    onError: (error) => {
      showErrorToast(error, 'Unable to retry ERP sync.');
    },
  });

  const failedCount = logs.filter((log) => log.statusLabel === 'Failed').length;
  const pendingCount = logs.filter((log) => log.statusLabel === 'Pending').length;
  const successCount = logs.filter((log) => log.statusLabel === 'Success').length;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <SyncMetric label="Successful Sync" value={successCount.toString()} tone="green" />
        <SyncMetric label="Pending Queue" value={pendingCount.toString()} tone="amber" />
        <SyncMetric label="Failed Sync" value={failedCount.toString()} tone="red" />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>ERP Sync Logs</CardTitle>
              <CardDescription>Purchase order synchronization attempts to the mock ERP connector.</CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <ServerCog className="h-4 w-4 text-blue-800" />
              Mock ERP Connector
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="rounded-lg border bg-slate-50 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <Label>Purchase Order</Label>
                <Select value={purchaseOrderId} onValueChange={setPurchaseOrderId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {purchaseOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.poNumber} - {order.supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button disabled={!purchaseOrderId || syncMutation.isPending || purchaseOrdersQuery.isLoading} onClick={() => syncMutation.mutate(purchaseOrderId)}>
                {syncMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Sync PO
              </Button>
            </div>
            {purchaseOrdersQuery.isError ? (
              <p className="mt-2 text-xs text-red-600">{getApiErrorMessage(purchaseOrdersQuery.error, 'Unable to load purchase orders.')}</p>
            ) : null}
          </div>

          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div>
              <Label htmlFor="erp-search">Search</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="erp-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search external id, PO, or error"
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="erp-date">Date</Label>
              <Input id="erp-date" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="mt-2" />
            </div>
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sync ID</TableHead>
                  <TableHead>Purchase Order</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Synced At</TableHead>
                  <TableHead className="min-w-[240px]">Error Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading ERP sync logs...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {logsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-red-600">
                      {getApiErrorMessage(logsQuery.error, 'Unable to load ERP sync logs.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!logsQuery.isLoading && !logsQuery.isError
                  ? filteredLogs.map((log) => (
                      <ErpSyncLogRow
                        key={log.id}
                        log={log}
                        isRetrying={retryMutation.isPending && retryMutation.variables === log.id}
                        onRetry={() => retryMutation.mutate(log.id)}
                      />
                    ))
                  : null}
                {!logsQuery.isLoading && !logsQuery.isError && filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-slate-500">
                      No sync logs match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ErpSyncLogRow({
  log,
  isRetrying,
  onRetry,
}: {
  log: ErpSyncLog;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  return (
    <TableRow>
      <TableCell className="font-medium text-slate-900">{log.id}</TableCell>
      <TableCell>{log.purchaseOrder.poNumber || '-'}</TableCell>
      <TableCell>{getOperationLabel(log.operation)}</TableCell>
      <TableCell>
        <ErpStatusBadge status={log.statusLabel} />
      </TableCell>
      <TableCell className="text-right">
        {log.attemptNo} / {log.maxAttempts}
      </TableCell>
      <TableCell>{log.syncedAt ? formatDateTime(log.syncedAt) : '-'}</TableCell>
      <TableCell className="text-sm text-slate-600">{log.errorMessage ?? '-'}</TableCell>
      <TableCell className="text-right">
        <Button size="sm" variant="outline" disabled={log.status !== 'FAILED' || isRetrying} onClick={onRetry}>
          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Retry
        </Button>
      </TableCell>
    </TableRow>
  );
}

function ErpStatusBadge({ status }: { status: ErpSyncStatusLabel }) {
  return <Badge variant={statusVariants[status]}>{status}</Badge>;
}

function SyncMetric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'amber' | 'red' }) {
  const toneClass = {
    green: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }[tone];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={toneClass}>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function formatDateTime(value: string) {
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
