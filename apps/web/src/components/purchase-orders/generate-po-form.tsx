'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FilePlus2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchPurchaseRequests, type PurchaseRequest } from '@/lib/purchase-request-api';
import { fetchSupplierOptions, generatePurchaseOrderFromPr, type SupplierOption } from '@/lib/purchase-order-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

export function GeneratePOForm() {
  const router = useRouter();
  const [requestId, setRequestId] = useState('');
  const [supplierId, setSupplierId] = useState('');

  const approvedRequestsQuery = useQuery({
    queryKey: ['purchase-requests', 'approved-for-po'],
    queryFn: () => fetchPurchaseRequests({ page: 1, limit: 100, status: 'APPROVED' }),
  });

  const suppliersQuery = useQuery({
    queryKey: ['suppliers', 'options'],
    queryFn: fetchSupplierOptions,
  });

  const approvedRequests = useMemo(() => approvedRequestsQuery.data?.data ?? [], [approvedRequestsQuery.data]);
  const suppliers = useMemo(() => suppliersQuery.data ?? [], [suppliersQuery.data]);

  useEffect(() => {
    if (!requestId && approvedRequests[0]) {
      setRequestId(approvedRequests[0].id);
    }
  }, [approvedRequests, requestId]);

  useEffect(() => {
    if (!supplierId && suppliers[0]) {
      setSupplierId(suppliers[0].id);
    }
  }, [supplierId, suppliers]);

  const selectedRequest = approvedRequests.find((request) => request.id === requestId);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const total = selectedRequest?.totalAmount ?? 0;

  const generateMutation = useMutation({
    mutationFn: () => generatePurchaseOrderFromPr(requestId, supplierId),
    onSuccess: (purchaseOrder) => {
      showSuccessToast('Purchase order generated.');
      router.push(`/purchase-orders/${purchaseOrder.id}`);
    },
    onError: (error) => {
      showErrorToast(error, 'Unable to generate purchase order.');
    },
  });

  const isLoading = approvedRequestsQuery.isLoading || suppliersQuery.isLoading;
  const error = approvedRequestsQuery.error ?? suppliersQuery.error;
  const isError = approvedRequestsQuery.isError || suppliersQuery.isError;
  const canGenerate = Boolean(selectedRequest && selectedSupplier) && !generateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Generate PO from Approved PR</CardTitle>
          <CardDescription>Select an approved purchase request and assign a supplier.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {isLoading ? (
            <div className="flex min-h-24 items-center text-sm text-slate-500 lg:col-span-2">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading approved purchase requests and suppliers...
            </div>
          ) : null}

          {isError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 lg:col-span-2">
              {getApiErrorMessage(error, 'Unable to load purchase order source data.')}
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <>
              <div>
                <Label>Approved Purchase Request</Label>
                <Select value={requestId} onValueChange={setRequestId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select approved PR" />
                  </SelectTrigger>
                  <SelectContent>
                    {approvedRequests.map((request) => (
                      <SelectItem key={request.id} value={request.id}>
                        {request.requestNumber} - {request.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Supplier</Label>
                <Select value={supplierId} onValueChange={setSupplierId}>
                  <SelectTrigger className="mt-2">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.code} - {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="rounded-lg border bg-slate-50 p-4 lg:col-span-2">
                <div className="grid gap-3 text-sm md:grid-cols-3">
                  <InfoLine label="Requester" value={selectedRequest?.requester.fullName ?? '-'} />
                  <InfoLine label="Department" value={selectedRequest?.department.name ?? '-'} />
                  <InfoLine label="Supplier Contact" value={selectedSupplier?.contact ?? '-'} />
                </div>
              </div>
            </>
          ) : null}
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
                {selectedRequest?.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unitCode}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.estimatedUnitPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
                {!selectedRequest ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      {approvedRequests.length ? 'Select an approved purchase request.' : 'No approved purchase requests are available for PO generation.'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm text-slate-500">Grand Total</div>
              <div className="text-2xl font-semibold text-slate-950">{formatCurrency(total)}</div>
            </div>
            <Button disabled={!canGenerate} onClick={() => generateMutation.mutate()}>
              {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              Generate Draft PO
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
