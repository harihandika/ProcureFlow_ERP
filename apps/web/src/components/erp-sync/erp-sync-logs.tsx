'use client';

import { useMemo, useState } from 'react';
import { RefreshCw, Search, ServerCog } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { erpSyncLogs as initialErpSyncLogs, type ErpSyncLog, type ErpSyncStatus } from '@/lib/erp-audit-data';

const statusOptions = ['All', 'Pending', 'Success', 'Failed'] as const;

const statusVariants: Record<ErpSyncStatus, BadgeProps['variant']> = {
  Pending: 'amber',
  Success: 'green',
  Failed: 'red',
};

export function ErpSyncLogs() {
  const [logs, setLogs] = useState<ErpSyncLog[]>(initialErpSyncLogs);
  const [statusFilter, setStatusFilter] = useState<(typeof statusOptions)[number]>('All');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  const filteredLogs = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
      const matchesDate = !dateFilter || log.syncedAt.startsWith(dateFilter);
      const matchesSearch =
        !keyword ||
        log.poNumber.toLowerCase().includes(keyword) ||
        log.supplierName.toLowerCase().includes(keyword) ||
        log.id.toLowerCase().includes(keyword);

      return matchesStatus && matchesDate && matchesSearch;
    });
  }, [dateFilter, logs, search, statusFilter]);

  function retrySync(logId: string) {
    setLogs((current) =>
      current.map((log) =>
        log.id === logId
          ? {
              ...log,
              status: 'Pending',
              attempts: log.attempts + 1,
              errorMessage: undefined,
              syncedAt: '2026-05-12 15:30',
            }
          : log,
      ),
    );
  }

  const failedCount = logs.filter((log) => log.status === 'Failed').length;
  const pendingCount = logs.filter((log) => log.status === 'Pending').length;
  const successCount = logs.filter((log) => log.status === 'Success').length;

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
              <CardDescription>Dummy simulation of purchase order synchronization to an external ERP.</CardDescription>
            </div>
            <div className="flex items-center gap-2 rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <ServerCog className="h-4 w-4 text-blue-800" />
              Mock ERP Connector
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div>
              <Label htmlFor="erp-search">Search</Label>
              <div className="relative mt-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="erp-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search sync id, PO, or supplier"
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
                    <SelectItem key={status} value={status}>
                      {status}
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
                  <TableHead>Supplier</TableHead>
                  <TableHead>Operation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Synced At</TableHead>
                  <TableHead className="min-w-[240px]">Error Message</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium text-slate-900">{log.id}</TableCell>
                    <TableCell>{log.poNumber}</TableCell>
                    <TableCell>{log.supplierName}</TableCell>
                    <TableCell>{log.operation}</TableCell>
                    <TableCell>
                      <ErpStatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-right">{log.attempts}</TableCell>
                    <TableCell>{log.syncedAt}</TableCell>
                    <TableCell className="text-sm text-slate-600">{log.errorMessage ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" disabled={log.status !== 'Failed'} onClick={() => retrySync(log.id)}>
                        <RefreshCw className="h-4 w-4" />
                        Retry
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-slate-500">
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

function ErpStatusBadge({ status }: { status: ErpSyncStatus }) {
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
