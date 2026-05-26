import { Badge, type BadgeProps } from '@/components/ui/badge';
import type { ReceivingStatusLabel } from '@/lib/receiving-api';

const statusVariant: Record<ReceivingStatusLabel, BadgeProps['variant']> = {
  Partial: 'amber',
  Full: 'green',
  Cancelled: 'red',
};

export function ReceivingStatusBadge({ status }: { status: ReceivingStatusLabel }) {
  return <Badge variant={statusVariant[status]}>{status}</Badge>;
}
