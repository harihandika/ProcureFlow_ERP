import type { Budget } from '@/lib/budget-data';
import { getBudgetHealth, getBudgetUsage } from '@/lib/budget-data';
import { cn } from '@/lib/utils';

export function BudgetProgress({ budget }: { budget: Budget }) {
  const usage = getBudgetUsage(budget);
  const health = getBudgetHealth(budget);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>Used budget</span>
        <span className="font-semibold text-slate-700">{usage}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={cn(
            'h-full rounded-full',
            health === 'danger' && 'bg-red-600',
            health === 'warning' && 'bg-amber-500',
            health === 'normal' && 'bg-blue-700',
          )}
          style={{ width: `${Math.min(usage, 100)}%` }}
        />
      </div>
    </div>
  );
}
