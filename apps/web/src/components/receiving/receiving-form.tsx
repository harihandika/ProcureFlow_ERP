'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Barcode, Loader2, PackageCheck, Search } from 'lucide-react';
import { ReceivingStatusBadge } from '@/components/receiving/receiving-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchPurchaseOrders, type PurchaseOrder, type PurchaseOrderItem } from '@/lib/purchase-order-api';
import { createReceiving, type CreateReceivingPayload, type ReceivingStatusLabel } from '@/lib/receiving-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type ReceivingLineInput = {
  purchaseOrderItemId: string;
  itemCode?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
};

type PreparedItem = PurchaseOrderItem & {
  input: ReceivingLineInput;
  remainingAfterInput: number;
  totalReceived: number;
  overReceiving: boolean;
  invalidAcceptance: boolean;
};

export function ReceivingForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [barcode, setBarcode] = useState('');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('');
  const [remarks, setRemarks] = useState('');
  const [lineInputs, setLineInputs] = useState<Record<string, ReceivingLineInput>>({});

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', 'receivable-options'],
    queryFn: () => fetchPurchaseOrders({ page: 1, limit: 100 }),
  });

  const receivablePurchaseOrders = useMemo(
    () => (purchaseOrdersQuery.data?.data ?? []).filter((order) => ['ISSUED', 'PARTIALLY_RECEIVED'].includes(order.status)),
    [purchaseOrdersQuery.data],
  );

  useEffect(() => {
    if (!purchaseOrderId && receivablePurchaseOrders[0]) {
      setPurchaseOrderId(receivablePurchaseOrders[0].id);
    }
  }, [purchaseOrderId, receivablePurchaseOrders]);

  const selectedPO = receivablePurchaseOrders.find((order) => order.id === purchaseOrderId) ?? null;

  useEffect(() => {
    setBarcode('');
    setLineInputs(buildLineInputs(selectedPO));
  }, [selectedPO]);

  const preparedItems = useMemo(
    () =>
      (selectedPO?.items ?? []).map((item) => {
        const input = lineInputs[item.id] ?? buildLineInput(item);
        const receivedQuantity = Number(input.receivedQuantity) || 0;
        const acceptedQuantity = Number(input.acceptedQuantity) || 0;
        const rejectedQuantity = Number(input.rejectedQuantity) || 0;
        const totalReceived = item.quantityReceived + receivedQuantity;

        return {
          ...item,
          input,
          totalReceived,
          remainingAfterInput: Math.max(item.quantityOrdered - totalReceived, 0),
          overReceiving: totalReceived > item.quantityOrdered,
          invalidAcceptance: acceptedQuantity + rejectedQuantity > receivedQuantity,
        };
      }),
    [lineInputs, selectedPO],
  );

  const receivingStatus = getReceivingStatusFromItems(preparedItems);
  const hasReceivedItems = preparedItems.some((item) => item.input.receivedQuantity > 0);
  const hasValidationError = preparedItems.some((item) => item.overReceiving || item.invalidAcceptance);
  const scannedMatch = barcode.trim()
    ? selectedPO?.items.find((item) => item.sku.toLowerCase() === barcode.trim().toLowerCase())
    : null;

  const createMutation = useMutation({
    mutationFn: (payload: CreateReceivingPayload) => createReceiving(payload),
    onSuccess: (receiving) => {
      void queryClient.invalidateQueries({ queryKey: ['receiving'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      showSuccessToast('Receiving record created.');
      router.push(`/receiving/${receiving.id}`);
    },
    onError: (error) => {
      showErrorToast(error, 'Unable to create receiving record.');
    },
  });

  function changePurchaseOrder(value: string) {
    setPurchaseOrderId(value);
  }

  function updateLine(itemId: string, key: keyof Omit<ReceivingLineInput, 'purchaseOrderItemId'>, value: number | string | undefined) {
    setLineInputs((current) => ({
      ...current,
      [itemId]: {
        ...(current[itemId] ?? buildLineInput(selectedPO?.items.find((item) => item.id === itemId))),
        [key]: value,
      },
    }));
  }

  function applyBarcodeReceive() {
    if (!scannedMatch) {
      return;
    }

    const current = lineInputs[scannedMatch.id] ?? buildLineInput(scannedMatch);
    const remaining = Math.max(scannedMatch.quantityOrdered - scannedMatch.quantityReceived - current.receivedQuantity, 0);
    const nextQuantity = remaining > 0 ? 1 : 0;

    setLineInputs((currentInputs) => ({
      ...currentInputs,
      [scannedMatch.id]: {
        ...(currentInputs[scannedMatch.id] ?? buildLineInput(scannedMatch)),
        itemCode: barcode.trim(),
        receivedQuantity: (currentInputs[scannedMatch.id]?.receivedQuantity ?? 0) + nextQuantity,
        acceptedQuantity: (currentInputs[scannedMatch.id]?.acceptedQuantity ?? 0) + nextQuantity,
      },
    }));
  }

  function submitReceiving() {
    if (!selectedPO || !hasReceivedItems || hasValidationError) {
      return;
    }

    createMutation.mutate({
      purchaseOrderId: selectedPO.id,
      warehouseId: selectedPO.warehouseId,
      deliveryNoteNo,
      remarks,
      items: preparedItems
        .filter((item) => item.input.receivedQuantity > 0)
        .map((item) => ({
          purchaseOrderItemId: item.id,
          itemCode: item.input.itemCode,
          quantityReceived: item.input.receivedQuantity,
          quantityAccepted: item.input.acceptedQuantity || item.input.receivedQuantity,
          quantityRejected: item.input.rejectedQuantity || undefined,
        })),
    });
  }

  const isLoading = purchaseOrdersQuery.isLoading;
  const isError = purchaseOrdersQuery.isError;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Receiving</CardTitle>
          <CardDescription>Select a purchase order and record partial or full received quantities.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          {isLoading ? (
            <div className="flex min-h-24 items-center text-sm text-slate-500 lg:col-span-3">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading receivable purchase orders...
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-3">
              {getApiErrorMessage(purchaseOrdersQuery.error, 'Unable to load purchase order options.')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <div>
                <Label>Purchase Order</Label>
                <Select value={purchaseOrderId} onValueChange={changePurchaseOrder}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select purchase order" />
                  </SelectTrigger>
                  <SelectContent>
                    {receivablePurchaseOrders.map((order) => (
                      <SelectItem key={order.id} value={order.id}>
                        {order.poNumber} - {order.supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="deliveryNoteNo">Delivery Note No</Label>
                <Input
                  id="deliveryNoteNo"
                  value={deliveryNoteNo}
                  onChange={(event) => setDeliveryNoteNo(event.target.value)}
                  className="mt-2"
                  placeholder="DN-2026-0001"
                />
              </div>

              <div>
                <Label>Receiving Status</Label>
                <div className="mt-2 flex h-10 items-center rounded-md border px-3">
                  <ReceivingStatusBadge status={receivingStatus} />
                </div>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 lg:col-span-3">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <InfoLine label="Supplier" value={selectedPO?.supplier.name ?? '-'} />
                  <InfoLine label="Warehouse" value={selectedPO?.warehouse.name ?? '-'} />
                  <InfoLine label="Expected Delivery" value={selectedPO?.expectedDeliveryDate ?? '-'} />
                </div>
              </div>

              <div className="lg:col-span-3">
                <Label htmlFor="remarks">Remarks</Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(event) => setRemarks(event.target.value)}
                  className="mt-2"
                  placeholder="Optional receiving notes"
                />
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barcode / Item Code Input</CardTitle>
          <CardDescription>Simulate scanning an item code and add one received quantity to the matched PO line.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
            <div className="flex-1">
              <Label htmlFor="barcode">Barcode or Item Code</Label>
              <div className="relative mt-2">
                <Barcode className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(event) => setBarcode(event.target.value)}
                  className="pl-9"
                  placeholder="Example: LAPTOP-STD-001"
                />
              </div>
              {barcode && !scannedMatch ? <p className="mt-2 text-xs text-red-600">Item code not found on selected PO.</p> : null}
              {scannedMatch ? <p className="mt-2 text-xs text-emerald-700">Matched: {scannedMatch.name}</p> : null}
            </div>
            <Button type="button" disabled={!scannedMatch} onClick={applyBarcodeReceive}>
              <Search className="h-4 w-4" />
              Apply Scan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PO Items</CardTitle>
          <CardDescription>Received quantity can be lower than ordered quantity to support partial receiving.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead className="min-w-[260px]">Item</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="text-right">Receive Qty</TableHead>
                  <TableHead className="text-right">Accepted</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preparedItems.map((item) => (
                  <TableRow key={item.id} className={barcode.trim().toLowerCase() === item.sku.toLowerCase() ? 'bg-blue-50' : undefined}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">{item.quantityOrdered}</TableCell>
                    <TableCell className="text-right">
                      <div className={cn('font-medium', item.overReceiving && 'text-red-600')}>
                        {item.totalReceived} / {item.quantityOrdered}
                      </div>
                      <div className="text-xs text-slate-500">previous {item.quantityReceived}</div>
                    </TableCell>
                    <TableCell className="text-right">{item.remainingAfterInput}</TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={lineInputs[item.id]?.receivedQuantity ?? 0}
                        onChange={(event) => updateLine(item.id, 'receivedQuantity', Number(event.target.value))}
                        className="ml-auto w-24 text-right"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={lineInputs[item.id]?.acceptedQuantity ?? 0}
                        onChange={(event) => updateLine(item.id, 'acceptedQuantity', Number(event.target.value))}
                        className={cn('ml-auto w-24 text-right', item.invalidAcceptance && 'border-red-500')}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min="0"
                        value={lineInputs[item.id]?.rejectedQuantity ?? 0}
                        onChange={(event) => updateLine(item.id, 'rejectedQuantity', Number(event.target.value))}
                        className={cn('ml-auto w-24 text-right', item.invalidAcceptance && 'border-red-500')}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {!selectedPO ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-slate-500">
                      {receivablePurchaseOrders.length
                        ? 'Select a purchase order to view items.'
                        : 'No issued or partially received purchase orders are available.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1 text-sm text-slate-600">
              <span className="flex items-center gap-2">
                <PackageCheck className="h-4 w-4 text-blue-800" />
                Partial receiving is allowed when received quantity is below ordered quantity.
              </span>
              {hasValidationError ? (
                <span className="text-red-600">Received quantity cannot exceed ordered quantity, and accepted plus rejected cannot exceed received.</span>
              ) : null}
            </div>
            <Button disabled={!hasReceivedItems || hasValidationError || createMutation.isPending} onClick={submitReceiving}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit Receiving
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function buildLineInputs(purchaseOrder: PurchaseOrder | null) {
  return Object.fromEntries((purchaseOrder?.items ?? []).map((item) => [item.id, buildLineInput(item)]));
}

function buildLineInput(item?: PurchaseOrderItem): ReceivingLineInput {
  return {
    purchaseOrderItemId: item?.id ?? '',
    receivedQuantity: 0,
    acceptedQuantity: 0,
    rejectedQuantity: 0,
  };
}

function getReceivingStatusFromItems(items: PreparedItem[]): ReceivingStatusLabel {
  if (!items.length) {
    return 'Partial';
  }

  const isFull = items.every((item) => item.quantityReceived + item.input.receivedQuantity >= item.quantityOrdered);
  return isFull ? 'Full' : 'Partial';
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-950">{value}</div>
    </div>
  );
}
