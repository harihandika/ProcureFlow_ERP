import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PurchaseOrderDetail } from '@/components/purchase-orders/purchase-order-detail';
import { Button } from '@/components/ui/button';
import { purchaseOrders } from '@/lib/purchase-order-data';

export function generateStaticParams() {
  return purchaseOrders.map((order) => ({ id: order.id }));
}

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = purchaseOrders.find((item) => item.id === id);

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
            Back to purchase orders
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{order.poNo}</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Purchase order detail with supplier send and mock ERP sync actions.
        </p>
      </div>

      <PurchaseOrderDetail order={order} />
    </div>
  );
}
