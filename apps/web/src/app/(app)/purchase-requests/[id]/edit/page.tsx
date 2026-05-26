'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/components/auth/auth-provider';
import { PurchaseRequestForm } from '@/components/purchase-requests/purchase-request-form';
import { Button } from '@/components/ui/button';
import { getApiErrorMessage } from '@/lib/api-error';
import { fetchPurchaseRequest } from '@/lib/purchase-request-api';

export default function EditPurchaseRequestPage() {
  const { user } = useAuth();
  const params = useParams<{ id: string }>();
  const requestId = params.id;
  const canEditPurchaseRequest = user?.roles.some((role) => role === 'ADMIN' || role === 'REQUESTER') ?? false;

  const requestQuery = useQuery({
    queryKey: ['purchase-requests', requestId],
    queryFn: () => fetchPurchaseRequest(requestId),
    enabled: Boolean(requestId),
  });

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
          <Link href={`/purchase-requests/${requestId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to purchase request
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Edit Purchase Request</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Update a draft purchase request while keeping multi-item calculation and budget checks.
        </p>
      </div>

      {!canEditPurchaseRequest ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          You do not have permission to edit purchase requests.
        </div>
      ) : requestQuery.isLoading ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">Loading draft...</div>
      ) : requestQuery.isError || !requestQuery.data ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {getApiErrorMessage(requestQuery.error, 'Unable to load draft purchase request.')}
        </div>
      ) : requestQuery.data.status !== 'DRAFT' ? (
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
          Only draft purchase requests can be edited.
        </div>
      ) : (
        <PurchaseRequestForm request={requestQuery.data} />
      )}
    </div>
  );
}
