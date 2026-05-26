'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { ReceivingStatusBadge } from '@/components/receiving/receiving-status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchReceivingRecord, getReceivingStatusLabel, type ReceivingRecord } from '@/lib/receiving-api';

export function ReceivingDetail({ receivingId }: { receivingId: string }) {
  const receivingQuery = useQuery({
    queryKey: ['receiving', receivingId],
    queryFn: () => fetchReceivingRecord(receivingId),
  });

  if (receivingQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading receiving detail...
        </CardContent>
      </Card>
    );
  }

  if (receivingQuery.isError) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-red-600">
          {getApiErrorMessage(receivingQuery.error, 'Unable to load receiving detail.')}
        </CardContent>
      </Card>
    );
  }

  if (!receivingQuery.data) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
          Receiving record was not found.
        </CardContent>
      </Card>
    );
  }

  return <ReceivingDetailContent record={receivingQuery.data} />;
}

function ReceivingDetailContent({ record }: { record: ReceivingRecord }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="PO No" value={record.purchaseOrder.poNumber} />
        <DetailMetric label="Supplier" value={record.purchaseOrder.supplier?.name ?? '-'} />
        <DetailMetric label="Warehouse" value={record.warehouse.name} />
        <DetailMetric label="Received By" value={record.receivedBy?.fullName ?? '-'} />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>{record.receivingNumber}</CardTitle>
              <CardDescription>{record.deliveryNoteNo ?? 'No delivery note number'}</CardDescription>
            </div>
            <ReceivingStatusBadge status={getReceivingStatusLabel(record.status)} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-5 text-sm md:grid-cols-2">
          <InfoLine label="Received At" value={formatDateTime(record.receivedAt)} />
          <InfoLine label="PO Status After Receiving" value={record.purchaseOrder.status} />
          <InfoLine label="Remarks" value={record.remarks ?? '-'} />
          <InfoLine label="Warehouse Code" value={record.warehouse.code} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Received Items</CardTitle>
          <CardDescription>Received quantity versus ordered quantity for this goods receipt.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[260px]">Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received Total</TableHead>
                  <TableHead className="text-right">This GRN</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {record.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit || '-'}</TableCell>
                    <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                    <TableCell className="text-right">
                      {item.poQuantityReceived} / {item.orderedQuantity}
                    </TableCell>
                    <TableCell className="text-right">{item.receivedQuantity}</TableCell>
                    <TableCell className="text-right">{item.acceptedQuantity}</TableCell>
                    <TableCell className="text-right">{item.rejectedQuantity}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-lg">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-slate-50 p-3">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-950">{value}</div>
    </div>
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
