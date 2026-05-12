import Link from 'next/link';
import { ArrowUpRight, Plus, ShoppingCart } from 'lucide-react';
import { ErpSyncStatusBadge, POStatusBadge } from '@/components/purchase-orders/purchase-order-badges';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getPurchaseOrderTotal, purchaseOrders } from '@/lib/purchase-order-data';
import { formatCurrency } from '@/lib/utils';

export default function PurchaseOrdersPage() {
  const issuedCount = purchaseOrders.filter((order) => order.status === 'Issued' || order.status === 'Sent').length;
  const erpFailedCount = purchaseOrders.filter((order) => order.erpSyncStatus === 'Failed').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Purchase Orders</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Generate purchase orders from approved PRs, send them to suppliers, and simulate ERP synchronization.
          </p>
        </div>
        <Button asChild>
          <Link href="/purchase-orders/generate">
            <Plus className="h-4 w-4" />
            Generate PO
          </Link>
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Total PO" value={String(purchaseOrders.length)} caption="Dummy purchase orders" />
        <SummaryCard label="Issued or Sent" value={String(issuedCount)} caption="Supplier-facing orders" />
        <SummaryCard label="ERP Failures" value={String(erpFailedCount)} caption="Need sync retry" />
      </section>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Order List</CardTitle>
            <CardDescription>Current PO documents and ERP sync status.</CardDescription>
          </div>
          <div className="rounded-md bg-blue-50 p-2 text-blue-800">
            <ShoppingCart className="h-4 w-4" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">PO No</TableHead>
                  <TableHead>PR No</TableHead>
                  <TableHead className="min-w-[240px]">Supplier</TableHead>
                  <TableHead>PO Status</TableHead>
                  <TableHead>ERP Sync</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-[90px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="font-medium text-slate-900">{order.poNo}</div>
                      <div className="text-xs text-slate-500">{order.createdAt}</div>
                    </TableCell>
                    <TableCell>{order.prNo}</TableCell>
                    <TableCell>{order.supplierName}</TableCell>
                    <TableCell>
                      <POStatusBadge status={order.status} />
                    </TableCell>
                    <TableCell>
                      <ErpSyncStatusBadge status={order.erpSyncStatus} />
                    </TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(getPurchaseOrderTotal(order.items))}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${order.poNo}`}>
                        <Link href={`/purchase-orders/${order.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
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
