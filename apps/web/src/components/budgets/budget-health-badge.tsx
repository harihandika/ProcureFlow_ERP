import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Budget } from '@/lib/budget-data';
import { getBudgetHealth, getBudgetUsage } from '@/lib/budget-data';

export function BudgetHealthBadge({ budget }: { budget: Budget }) {
  const health = getBudgetHealth(budget);

  if (health === 'danger') {
    return (
      <Badge variant="red" className="gap-1">
        <AlertTriangle className="h-3.5 w-3.5" />
        Overspent
      </Badge>
    );
  }

  if (health === 'warning') {
    return (
      <Badge variant="amber" className="gap-1">
        <AlertTriangle className="h-3.5 w-3.5" />
        Usage {getBudgetUsage(budget)}%
      </Badge>
    );
  }

  return (
    <Badge variant="green" className="gap-1">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Healthy
    </Badge>
  );
}
