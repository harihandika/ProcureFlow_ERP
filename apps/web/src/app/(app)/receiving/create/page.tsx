import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ReceivingForm } from '@/components/receiving/receiving-form';
import { Button } from '@/components/ui/button';

export default function CreateReceivingPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href="/receiving">
            <ArrowLeft className="h-4 w-4" />
            Back to receiving
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Create Receiving</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Select a purchase order, scan an item code, and record partial or full received quantities.
        </p>
      </div>

      <ReceivingForm />
    </div>
  );
}
