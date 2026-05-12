import type React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Banknote, CalendarDays, Landmark, Wallet } from 'lucide-react';
import { BudgetHealthBadge } from '@/components/budgets/budget-health-badge';
import { BudgetProgress } from '@/components/budgets/budget-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { budgetTransactions, budgets, getRemainingBudget } from '@/lib/budget-data';
import { formatCurrency } from '@/lib/utils';

export function generateStaticParams() {
  return budgets.map((budget) => ({ id: budget.id }));
}

export default async function BudgetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const budget = budgets.find((item) => item.id === id);

  if (!budget) {
    notFound();
  }

  const transactions = budgetTransactions.filter((transaction) => transaction.budgetId === budget.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-3 mb-2">
            <Link href="/budgets">
              <ArrowLeft className="h-4 w-4" />
              Back to budgets
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal text-slate-950">{budget.name}</h1>
            <BudgetHealthBadge budget={budget} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            {budget.code} for {budget.department}, {budget.period}. Dummy detail view for portfolio budget management.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Total Budget" value={formatCurrency(budget.totalBudget)} icon={Landmark} />
        <DetailMetric label="Used Budget" value={formatCurrency(budget.usedBudget)} icon={Wallet} />
        <DetailMetric label="Remaining Budget" value={formatCurrency(getRemainingBudget(budget))} icon={Banknote} />
        <DetailMetric label="Period" value={budget.period} icon={CalendarDays} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Budget Usage</CardTitle>
          <CardDescription>Usage progress turns amber above 80% and red when overspent.</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetProgress budget={budget} />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Reserved</div>
              <div className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.reservedBudget)}</div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Department</div>
              <div className="mt-1 font-semibold text-slate-950">{budget.department}</div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Last Updated</div>
              <div className="mt-1 font-semibold text-slate-950">{budget.updatedAt}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Budget Transaction History</CardTitle>
          <CardDescription>Allocation, reservation, commitment, consumption, release, and adjustment records.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[170px]">Transaction No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Posted By</TableHead>
                  <TableHead>Posted At</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium text-slate-900">{transaction.transactionNo}</TableCell>
                    <TableCell>{transaction.type}</TableCell>
                    <TableCell>{transaction.reference}</TableCell>
                    <TableCell className="min-w-[260px]">{transaction.description}</TableCell>
                    <TableCell>{transaction.createdBy}</TableCell>
                    <TableCell>{transaction.postedAt}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                  </TableRow>
                ))}
                {!transactions.length ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-slate-500">
                      No transaction history for this budget.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DetailMetric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <CardDescription>{label}</CardDescription>
        <div className="rounded-md bg-blue-50 p-2 text-blue-800">
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="text-xl">{value}</CardTitle>
      </CardContent>
    </Card>
  );
}
