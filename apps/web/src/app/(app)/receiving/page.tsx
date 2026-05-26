'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Loader2, PackageCheck, Plus } from 'lucide-react';
import { ReceivingStatusBadge } from '@/components/receiving/receiving-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchReceivingRecords,
  getReceivingStatusLabel,
  type ReceivingRecord,
} from '@/lib/receiving-api';

export default function ReceivingPage() {
  const receivingQuery = useQuery({
    queryKey: ['receiving', 'list', { page: 1, limit: 50 }],
    queryFn: () => fetchReceivingRecords({ page: 1, limit: 50 }),
  });

  const receivingRecords = receivingQuery.data?.data ?? [];
  const partialCount = receivingRecords.filter((record) => record.status === 'PARTIAL').length;
  const fullCount = receivingRecords.filter((record) => record.status === 'FULL').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Receiving</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Record partial or full goods receiving against purchase orders.
          </p>
        </div>
        <Button asChild>
          <Link href="/receiving/create">
            <Plus className="h-4 w-4" />
            Create Receiving
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Receiving Records" value={String(receivingQuery.data?.meta.total ?? receivingRecords.length)} caption="GRN history from backend" />
        <SummaryCard label="Partial" value={String(partialCount)} caption="PO still has remaining quantity" />
        <SummaryCard label="Full" value={String(fullCount)} caption="PO quantity fulfilled" />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Receiving List</CardTitle>
            <CardDescription>Goods receipt notes and their receiving status.</CardDescription>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-800">
            <PackageCheck className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Receiving No</TableHead>
                  <TableHead>PO No</TableHead>
                  <TableHead className="min-w-[230px]">Supplier</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Received By</TableHead>
                  <TableHead>Received At</TableHead>
                  <TableHead className="w-[90px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading receiving records...
                      </span>
                    </TableCell>
                  </TableRow>
                ) : null}
                {receivingQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-red-600">
                      {getApiErrorMessage(receivingQuery.error, 'Unable to load receiving records.')}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!receivingQuery.isLoading && !receivingQuery.isError
                  ? receivingRecords.map((record) => <ReceivingRow key={record.id} record={record} />)
                  : null}
                {!receivingQuery.isLoading && !receivingQuery.isError && !receivingRecords.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      No receiving records have been created yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Receiving History Table</CardTitle>
          <CardDescription>Line-level received quantity versus ordered quantity.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receiving No</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[240px]">Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received Total</TableHead>
                  <TableHead className="text-right">This GRN</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivingRecords.flatMap((record) =>
                  record.items.map((item) => (
                    <TableRow key={`${record.id}-${item.id}`}>
                      <TableCell className="font-medium text-slate-900">{record.receivingNumber}</TableCell>
                      <TableCell>{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="font-medium">
                          {item.poQuantityReceived} / {item.orderedQuantity}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                      <TableCell className="text-right">{item.acceptedQuantity}</TableCell>
                      <TableCell className="text-right">{item.rejectedQuantity}</TableCell>
                    </TableRow>
                  )),
                )}
                {!receivingQuery.isLoading && !receivingQuery.isError && !receivingRecords.length ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      No receiving line history is available.
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

function ReceivingRow({ record }: { record: ReceivingRecord }) {
  return (
    <TableRow>
      <TableCell>
        <div className="font-medium text-slate-900">{record.receivingNumber}</div>
        <div className="text-xs text-slate-500">{record.deliveryNoteNo ?? '-'}</div>
      </TableCell>
      <TableCell>{record.purchaseOrder.poNumber}</TableCell>
      <TableCell>{record.purchaseOrder.supplier?.name ?? '-'}</TableCell>
      <TableCell>{record.warehouse.name}</TableCell>
      <TableCell>
        <ReceivingStatusBadge status={getReceivingStatusLabel(record.status)} />
      </TableCell>
      <TableCell>{record.receivedBy?.fullName ?? '-'}</TableCell>
      <TableCell>{formatDateTime(record.receivedAt)}</TableCell>
      <TableCell className="text-right">
        <Button asChild variant="ghost" size="icon" aria-label={`View ${record.receivingNumber}`}>
          <Link href={`/receiving/${record.id}`}>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </TableCell>
    </TableRow>
  );
}

function SummaryCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{caption}</p>
      </CardContent>
    </Card>
  );
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || '-';
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
