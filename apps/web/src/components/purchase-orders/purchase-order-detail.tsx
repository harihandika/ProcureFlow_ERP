'use client';

import { useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { ErpSyncStatusBadge, POStatusBadge } from '@/components/purchase-orders/purchase-order-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { ErpSyncStatus, PurchaseOrder, PurchaseOrderStatus } from '@/lib/purchase-order-data';
import { getPurchaseOrderTotal } from '@/lib/purchase-order-data';
import { formatCurrency } from '@/lib/utils';

export function PurchaseOrderDetail({ order }: { order: PurchaseOrder }) {
  const [status, setStatus] = useState<PurchaseOrderStatus>(order.status);
  const [erpSyncStatus, setErpSyncStatus] = useState<ErpSyncStatus>(order.erpSyncStatus);
  const [sentAt, setSentAt] = useState(order.sentAt);
  const [syncedAt, setSyncedAt] = useState(order.syncedAt);
  const total = getPurchaseOrderTotal(order.items);

  function sendToSupplier() {
    setStatus('Sent');
    setSentAt('2026-05-12 15:00');
  }

  function syncToErp() {
    setErpSyncStatus('Success');
    setSyncedAt('2026-05-12 15:05');
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Supplier" value={order.supplierName} />
        <DetailMetric label="Warehouse" value={order.warehouse} />
        <DetailMetric label="Expected Delivery" value={order.expectedDeliveryDate} />
        <DetailMetric label="Total Amount" value={formatCurrency(total)} />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{order.poNo}</CardTitle>
              <CardDescription>Generated from {order.prNo}</CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <POStatusBadge status={status} />
                <ErpSyncStatusBadge status={erpSyncStatus} />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button variant="outline" disabled={status === 'Sent' || status === 'Completed'} onClick={sendToSupplier}>
                <Send className="h-4 w-4" />
                Send to Supplier
              </Button>
              <Button disabled={erpSyncStatus === 'Success'} onClick={syncToErp}>
                <RefreshCw className="h-4 w-4" />
                Sync to ERP
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoLine label="Created At" value={order.createdAt} />
            <InfoLine label="Sent At" value={sentAt ?? 'Not sent'} />
            <InfoLine label="ERP Synced At" value={syncedAt ?? 'Not synced'} />
            <InfoLine label="Supplier Contact" value="sales demo contact" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PO Item Table</CardTitle>
          <CardDescription>Line items copied from the approved purchase request.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[260px]">Item</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={`${order.id}-${item.sku}`}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
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
