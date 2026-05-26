'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Send } from 'lucide-react';
import { ErpSyncStatusBadge, POStatusBadge } from '@/components/purchase-orders/purchase-order-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchPurchaseOrder,
  getErpSyncStatusLabel,
  getPurchaseOrderStatusLabel,
  updatePurchaseOrderStatus,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from '@/lib/purchase-order-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

const editableStatuses: PurchaseOrderStatus[] = ['DRAFT', 'ISSUED', 'CANCELLED'];

export function PurchaseOrderDetail({ orderId }: { orderId: string }) {
  const queryClient = useQueryClient();
  const queryKey = ['purchase-orders', orderId] as const;

  const purchaseOrderQuery = useQuery({
    queryKey,
    queryFn: () => fetchPurchaseOrder(orderId),
  });

  const statusMutation = useMutation({
    mutationFn: (status: PurchaseOrderStatus) => updatePurchaseOrderStatus(orderId, status),
    onSuccess: (purchaseOrder) => {
      queryClient.setQueryData(queryKey, purchaseOrder);
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      showSuccessToast('Purchase order status updated.');
    },
    onError: (error) => {
      showErrorToast(error, 'Unable to update purchase order status.');
    },
  });

  if (purchaseOrderQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading purchase order detail...
        </CardContent>
      </Card>
    );
  }

  if (purchaseOrderQuery.isError) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-red-600">
          {getApiErrorMessage(purchaseOrderQuery.error, 'Unable to load purchase order detail.')}
        </CardContent>
      </Card>
    );
  }

  if (!purchaseOrderQuery.data) {
    return (
      <Card>
        <CardContent className="flex min-h-[260px] items-center justify-center text-sm text-slate-500">
          Purchase order was not found.
        </CardContent>
      </Card>
    );
  }

  return <PurchaseOrderDetailContent order={purchaseOrderQuery.data} isUpdating={statusMutation.isPending} onStatusChange={statusMutation.mutate} />;
}

function PurchaseOrderDetailContent({
  order,
  isUpdating,
  onStatusChange,
}: {
  order: PurchaseOrder;
  isUpdating: boolean;
  onStatusChange: (status: PurchaseOrderStatus) => void;
}) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Supplier" value={order.supplier.name} />
        <DetailMetric label="Warehouse" value={order.warehouse.name} />
        <DetailMetric label="Expected Delivery" value={order.expectedDeliveryDate ?? '-'} />
        <DetailMetric label="Total Amount" value={formatCurrency(order.totalAmount)} />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>{order.poNumber}</CardTitle>
              <CardDescription>
                Generated from {order.purchaseRequest?.requestNumber ?? '-'} - {order.purchaseRequest?.title ?? 'No PR title'}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <POStatusBadge status={getPurchaseOrderStatusLabel(order.status)} />
                <ErpSyncStatusBadge status={getErpSyncStatusLabel(order.erpSyncStatus)} />
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Select value={order.status} disabled={isUpdating} onValueChange={(value) => onStatusChange(value as PurchaseOrderStatus)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {editableStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {getPurchaseOrderStatusLabel(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                disabled={isUpdating || order.status === 'ISSUED' || order.status === 'CANCELLED'}
                onClick={() => onStatusChange('ISSUED')}
              >
                {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to Supplier
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-5">
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <InfoLine label="Created At" value={formatDateTime(order.createdAt)} />
            <InfoLine label="Issued At" value={order.issueDate ?? 'Not issued'} />
            <InfoLine label="ERP Synced At" value={order.syncedAt ? formatDateTime(order.syncedAt) : 'Not synced'} />
            <InfoLine label="Supplier Contact" value={order.supplier.email ?? order.supplier.contactName ?? order.supplier.phone ?? '-'} />
            <InfoLine label="PR Requester" value={order.purchaseRequest?.requester?.fullName ?? '-'} />
            <InfoLine label="PR Department" value={order.purchaseRequest?.department?.name ?? '-'} />
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
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
                {!order.items.length ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-slate-500">
                      No items are attached to this purchase order.
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
