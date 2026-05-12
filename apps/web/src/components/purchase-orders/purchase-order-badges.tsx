import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ErpSyncStatus, PurchaseOrderStatus } from '@/lib/purchase-order-data';

const poStatusVariant: Record<PurchaseOrderStatus, BadgeProps['variant']> = {
  Draft: 'slate',
  Issued: 'blue',
  Sent: 'amber',
  'Partially Received': 'amber',
  Completed: 'green',
  Cancelled: 'red',
};

const erpStatusVariant: Record<ErpSyncStatus, BadgeProps['variant']> = {
  'Not Synced': 'slate',
  Pending: 'amber',
  Success: 'green',
  Failed: 'red',
};

export function POStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return <Badge variant={poStatusVariant[status]}>{status}</Badge>;
}

export function ErpSyncStatusBadge({ status }: { status: ErpSyncStatus }) {
  return <Badge variant={erpStatusVariant[status]}>ERP {status}</Badge>;
}
