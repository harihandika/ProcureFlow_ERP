import { PurchaseRequestForm } from '@/components/purchase-requests/purchase-request-form';

export default function CreatePurchaseRequestPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Create Purchase Request</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Build a multi-item purchase request with live subtotal, grand total, and budget remaining checks.
        </p>
      </div>

      <PurchaseRequestForm />
    </div>
  );
}
