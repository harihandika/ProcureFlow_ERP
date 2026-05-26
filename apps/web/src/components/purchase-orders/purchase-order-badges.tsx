import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ErpSyncStatusLabel, PurchaseOrderStatusLabel } from '@/lib/purchase-order-api';

const poStatusVariant: Record<PurchaseOrderStatusLabel, BadgeProps['variant']> = {
  Draft: 'slate',
  Issued: 'blue',
  'Partially Received': 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

const erpStatusVariant: Record<ErpSyncStatusLabel, BadgeProps['variant']> = {
  'Not Synced': 'slate',
  Pending: 'amber',
  Success: 'green',
  Failed: 'red',
  Retrying: 'amber',
};

export function POStatusBadge({ status }: { status: PurchaseOrderStatusLabel }) {
  return <Badge variant={poStatusVariant[status]}>{status}</Badge>;
}

export function ErpSyncStatusBadge({ status }: { status: ErpSyncStatusLabel }) {
  return <Badge variant={erpStatusVariant[status]}>ERP {status}</Badge>;
}
