'use client';

import { useMemo, useState } from 'react';
import { Barcode, PackageCheck, Search } from 'lucide-react';
import { ReceivingStatusBadge } from '@/components/receiving/receiving-status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  getPreviouslyReceivedQuantity,
  getReceivingStatusFromItems,
  receivablePurchaseOrders,
} from '@/lib/receiving-data';
import { cn } from '@/lib/utils';

type ReceivingLineInput = {
  sku: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
};

export function ReceivingForm() {
  const [purchaseOrderId, setPurchaseOrderId] = useState(receivablePurchaseOrders[0]?.id ?? '');
  const [barcode, setBarcode] = useState('');
  const [deliveryNoteNo, setDeliveryNoteNo] = useState('DN-DEMO-2026-001');
  const selectedPO = receivablePurchaseOrders.find((order) => order.id === purchaseOrderId);
  const [lineInputs, setLineInputs] = useState<Record<string, ReceivingLineInput>>(() =>
    Object.fromEntries(
      (receivablePurchaseOrders[0]?.items ?? []).map((item) => [
        item.sku,
        {
          sku: item.sku,
          receivedQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
        },
      ]),
    ),
  );

  const preparedItems = useMemo(
    () =>
      (selectedPO?.items ?? []).map((item) => {
        const input = lineInputs[item.sku] ?? {
          sku: item.sku,
          receivedQuantity: 0,
          acceptedQuantity: 0,
          rejectedQuantity: 0,
        };
        return {
          sku: item.sku,
          name: item.name,
          orderedQuantity: item.quantity,
          previouslyReceived: getPreviouslyReceivedQuantity(selectedPO?.poNo ?? '', item.sku),
          receivedQuantity: Number(input.receivedQuantity) || 0,
          acceptedQuantity: Number(input.acceptedQuantity) || 0,
          rejectedQuantity: Number(input.rejectedQuantity) || 0,
        };
      }),
    [lineInputs, selectedPO],
  );
  const receivingStatus = getReceivingStatusFromItems(preparedItems);
  const hasReceivedItems = preparedItems.some((item) => item.receivedQuantity > 0);
  const scannedMatch = barcode.trim()
    ? selectedPO?.items.find((item) => item.sku.toLowerCase() === barcode.trim().toLowerCase())
    : null;

  function changePurchaseOrder(value: string) {
    const po = receivablePurchaseOrders.find((order) => order.id === value);
    setPurchaseOrderId(value);
    setBarcode('');
    setLineInputs(
      Object.fromEntries(
        (po?.items ?? []).map((item) => [
          item.sku,
          {
            sku: item.sku,
            receivedQuantity: 0,
            acceptedQuantity: 0,
            rejectedQuantity: 0,
          },
        ]),
      ),
    );
  }

  function updateLine(sku: string, key: keyof Omit<ReceivingLineInput, 'sku'>, value: number) {
    setLineInputs((current) => ({
      ...current,
      [sku]: {
        ...(current[sku] ?? { sku, receivedQuantity: 0, acceptedQuantity: 0, rejectedQuantity: 0 }),
        [key]: value,
      },
    }));
  }

  function applyBarcodeReceive() {
    if (!scannedMatch) {
      return;
    }

    const previous = getPreviouslyReceivedQuantity(selectedPO?.poNo ?? '', scannedMatch.sku);
    const remaining = Math.max(scannedMatch.quantity - previous - (lineInputs[scannedMatch.sku]?.receivedQuantity ?? 0), 0);
    const nextQuantity = remaining > 0 ? 1 : 0;

    updateLine(scannedMatch.sku, 'receivedQuantity', (lineInputs[scannedMatch.sku]?.receivedQuantity ?? 0) + nextQuantity);
    updateLine(scannedMatch.sku, 'acceptedQuantity', (lineInputs[scannedMatch.sku]?.acceptedQuantity ?? 0) + nextQuantity);
  }

  function submitReceiving() {
    console.info('Dummy receiving submitted', {
      poNo: selectedPO?.poNo,
      deliveryNoteNo,
      status: receivingStatus,
      items: preparedItems,
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Create Receiving</CardTitle>
          <CardDescription>Select a purchase order and record partial or full received quantities.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-3">
          <div>
            <Label>Purchase Order</Label>
            <Select value={purchaseOrderId} onValueChange={changePurchaseOrder}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {receivablePurchaseOrders.map((order) => (
                  <SelectItem key={order.id} value={order.id}>
                    {order.poNo} - {order.supplierName}
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
              <InfoLine label="Supplier" value={selectedPO?.supplierName ?? '-'} />
              <InfoLine label="Warehouse" value={selectedPO?.warehouse ?? '-'} />
              <InfoLine label="Expected Delivery" value={selectedPO?.expectedDeliveryDate ?? '-'} />
            </div>
          </div>
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
                {preparedItems.map((item) => {
                  const totalReceived = item.previouslyReceived + item.receivedQuantity;
                  const remaining = Math.max(item.orderedQuantity - totalReceived, 0);
                  const overReceiving = totalReceived > item.orderedQuantity;

                  return (
                    <TableRow key={item.sku} className={barcode.trim().toLowerCase() === item.sku.toLowerCase() ? 'bg-blue-50' : undefined}>
                      <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell className="text-right">{item.orderedQuantity}</TableCell>
                      <TableCell className="text-right">
                        <div className={cn('font-medium', overReceiving && 'text-red-600')}>
                          {totalReceived} / {item.orderedQuantity}
                        </div>
                        <div className="text-xs text-slate-500">previous {item.previouslyReceived}</div>
                      </TableCell>
                      <TableCell className="text-right">{remaining}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={lineInputs[item.sku]?.receivedQuantity ?? 0}
                          onChange={(event) => updateLine(item.sku, 'receivedQuantity', Number(event.target.value))}
                          className="ml-auto w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={lineInputs[item.sku]?.acceptedQuantity ?? 0}
                          onChange={(event) => updateLine(item.sku, 'acceptedQuantity', Number(event.target.value))}
                          className="ml-auto w-24 text-right"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={lineInputs[item.sku]?.rejectedQuantity ?? 0}
                          onChange={(event) => updateLine(item.sku, 'rejectedQuantity', Number(event.target.value))}
                          className="ml-auto w-24 text-right"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <PackageCheck className="h-4 w-4 text-blue-800" />
              Partial receiving is allowed when received quantity is below ordered quantity.
            </div>
            <Button disabled={!hasReceivedItems} onClick={submitReceiving}>
              Submit Receiving
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-1 font-semibold text-slate-950">{value}</div>
    </div>
  );
}
