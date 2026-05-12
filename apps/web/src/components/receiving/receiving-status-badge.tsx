import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ReceivingStatus } from '@/lib/receiving-data';

const statusVariant: Record<ReceivingStatus, BadgeProps['variant']> = {
  Partial: 'amber',
  Full: 'green',
  Cancelled: 'red',
};

export function ReceivingStatusBadge({ status }: { status: ReceivingStatus }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}
