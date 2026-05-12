import { Badge, type BadgeProps } from '@/components/ui/badge';

export type WorkflowStatus = 'Draft' | 'Submitted' | 'Pending' | 'Approved' | 'Rejected' | 'Completed' | 'Failed';
export type MasterDataStatus = 'Active' | 'Inactive';
export type AppStatus = WorkflowStatus | MasterDataStatus;

const statusVariants: Record<WorkflowStatus, BadgeProps['variant']> = {
  Draft: 'slate',
  Submitted: 'blue',
  Pending: 'amber',
  Approved: 'green',
  Rejected: 'red',
  Completed: 'green',
  Failed: 'red',
};

const masterStatusVariants: Record<MasterDataStatus, BadgeProps['variant']> = {
  Active: 'green',
  Inactive: 'slate',
};

export function StatusBadge({ status }: { status: AppStatus }) {
  const variant =
    status === 'Active' || status === 'Inactive' ? masterStatusVariants[status] : statusVariants[status];

  return <Badge variant={variant}>{status}</Badge>;
}
