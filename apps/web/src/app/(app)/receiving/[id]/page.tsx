import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReceivingDetail } from '@/components/receiving/receiving-detail';
import { Button } from '@/components/ui/button';

export default async function ReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/receiving">
            <ArrowLeft className="h-4 w-4" />
            Back to receiving
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Receiving Detail</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Goods receipt detail with received quantity versus ordered quantity.
        </p>
      </div>

      <ReceivingDetail receivingId={id} />
    </div>
  );
}
