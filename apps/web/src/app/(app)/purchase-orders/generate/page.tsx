import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { GeneratePOForm } from '@/components/purchase-orders/generate-po-form';
import { Button } from '@/components/ui/button';

export default function GeneratePurchaseOrderPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/purchase-orders">
            <ArrowLeft className="h-4 w-4" />
            Back to purchase orders
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Generate Purchase Order</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Create a draft purchase order from an approved purchase request using dummy data.
        </p>
      </div>

      <GeneratePOForm />
    </div>
  );
}
