import type React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, CalendarDays, ClipboardList, Landmark, UserRound } from 'lucide-react';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getRequestTotal, purchaseRequests } from '@/lib/purchase-request-data';
import { formatCurrency } from '@/lib/utils';

export function generateStaticParams() {
  return purchaseRequests.map((request) => ({ id: request.id }));
}

export default async function PurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const request = purchaseRequests.find((item) => item.id === id);

  if (!request) {
    notFound();
  }

  const total = getRequestTotal(request.items);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/purchase-requests">
            <ArrowLeft className="h-4 w-4" />
            Back to purchase requests
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{request.prNo}</h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{request.title}</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Requester" value={request.requester} icon={UserRound} />
        <DetailMetric label="Department" value={request.department} icon={Landmark} />
        <DetailMetric label="Required Date" value={request.requiredDate} icon={CalendarDays} />
        <DetailMetric label="Grand Total" value={formatCurrency(total)} icon={ClipboardList} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Request Items</CardTitle>
          <CardDescription>Dummy detail view for purchase request item rows.</CardDescription>
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
                {request.items.map((item) => (
                  <TableRow key={`${request.id}-${item.itemId}`}>
                    <TableCell className="font-medium text-slate-900">{item.sku}</TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.estimatedPrice)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.estimatedPrice)}</TableCell>
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
