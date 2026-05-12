'use client';

import { useMemo, useState } from 'react';
import { FilePlus2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  approvedPurchaseRequests,
  getApprovedRequestTotal,
  mapApprovedRequestToPoItems,
  supplierOptions,
} from '@/lib/purchase-order-data';
import { formatCurrency } from '@/lib/utils';

export function GeneratePOForm() {
  const [requestId, setRequestId] = useState(approvedPurchaseRequests[0]?.id ?? '');
  const [supplierId, setSupplierId] = useState(supplierOptions[0]?.id ?? '');
  const [generatedMessage, setGeneratedMessage] = useState<string | null>(null);
  const selectedRequest = approvedPurchaseRequests.find((request) => request.id === requestId);
  const selectedSupplier = supplierOptions.find((supplier) => supplier.id === supplierId);
  const items = useMemo(() => mapApprovedRequestToPoItems(requestId), [requestId]);
  const total = getApprovedRequestTotal(requestId);

  function generatePo() {
    if (!selectedRequest || !selectedSupplier) {
      return;
    }

    setGeneratedMessage(`Dummy PO generated from ${selectedRequest.prNo} for ${selectedSupplier.name}.`);
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate PO from Approved PR</CardTitle>
          <CardDescription>Select an approved purchase request and assign a supplier.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div>
            <Label>Approved Purchase Request</Label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {approvedPurchaseRequests.map((request) => (
                  <SelectItem key={request.id} value={request.id}>
                    {request.prNo} - {request.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Supplier</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supplierOptions.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.code} - {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-slate-50 p-4 lg:col-span-2">
            <div className="grid gap-3 text-sm md:grid-cols-3">
              <InfoLine label="Requester" value={selectedRequest?.requester ?? '-'} />
              <InfoLine label="Department" value={selectedRequest?.department ?? '-'} />
              <InfoLine label="Supplier Contact" value={selectedSupplier?.contact ?? '-'} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>PO Item Table</CardTitle>
          <CardDescription>Items copied from the approved purchase request.</CardDescription>
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
                {items.map((item) => (
                  <TableRow key={`${requestId}-${item.sku}`}>
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
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-500">Grand Total</div>
              <div className="text-2xl font-semibold text-slate-950">{formatCurrency(total)}</div>
            </div>
            <Button onClick={generatePo}>
              <FilePlus2 className="h-4 w-4" />
              Generate Draft PO
            </Button>
          </div>
        </CardContent>
      </Card>

      {generatedMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          {generatedMessage}
        </div>
      ) : null}
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
