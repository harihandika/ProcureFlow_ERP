'use client';

import type React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ClipboardList, Landmark, Pencil, UserRound } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchPurchaseRequest, getStatusLabel } from '@/lib/purchase-request-api';
import { formatCurrency } from '@/lib/utils';

export default function PurchaseRequestDetailPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const requestId = params.id;

  const requestQuery = useQuery({
    queryKey: ['purchase-requests', requestId],
    queryFn: () => fetchPurchaseRequest(requestId),
    enabled: Boolean(requestId),
  });

  const request = requestQuery.data;
  const canEditPurchaseRequest = user?.roles.some((role) => role === 'ADMIN' || role === 'REQUESTER') ?? false;

  if (requestQuery.isLoading) {
    return <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading purchase request...</div>;
  }

  if (requestQuery.isError || !request) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/purchase-requests">
            <ArrowLeft className="h-4 w-4" />
            Back to purchase requests
          </Link>
        </Button>
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {getApiErrorMessage(requestQuery.error, 'Unable to load purchase request detail.')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link href="/purchase-requests">
              <ArrowLeft className="h-4 w-4" />
              Back to purchase requests
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{request.requestNumber}</h1>
            <StatusBadge status={getStatusLabel(request.status)} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">{request.title}</p>
        </div>
        {request.status === 'DRAFT' && canEditPurchaseRequest ? (
          <Button asChild variant="outline">
            <Link href={`/purchase-requests/${request.id}/edit`}>
              <Pencil className="h-4 w-4" />
              Edit Draft
            </Link>
          </Button>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Requester" value={request.requester.fullName} icon={UserRound} />
        <DetailMetric label="Department" value={request.department.name} icon={Landmark} />
        <DetailMetric label="Required Date" value={request.requiredDate ?? '-'} icon={CalendarDays} />
        <DetailMetric label="Grand Total" value={formatCurrency(request.totalAmount)} icon={ClipboardList} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Request Items</CardTitle>
          <CardDescription>API-backed purchase request item rows.</CardDescription>
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
                  <TableHead className="text-right">Estimated Price</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {request.items.length ? (
                  request.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{item.unitCode}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.estimatedUnitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No request items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="rounded-md bg-blue-50 p-2 text-blue-800">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-lg">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}
