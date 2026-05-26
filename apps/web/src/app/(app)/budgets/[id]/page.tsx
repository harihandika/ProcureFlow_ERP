'use client';

import type React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CalendarDays, Landmark, Wallet } from 'lucide-react';
import { BudgetHealthBadge } from '@/components/budgets/budget-health-badge';
import { BudgetProgress } from '@/components/budgets/budget-progress';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  fetchBudget,
  fetchBudgetTransactions,
  getBudgetUsedAmount,
  getBudgetUsage,
  getRemainingBudget,
} from '@/lib/budget-api';
import { formatCurrency } from '@/lib/utils';

export default function BudgetDetailPage() {
  const params = useParams<{ id: string }>();
  const budgetId = params.id;

  const budgetQuery = useQuery({
    queryKey: ['budgets', budgetId],
    queryFn: () => fetchBudget(budgetId),
    enabled: Boolean(budgetId),
  });

  const transactionsQuery = useQuery({
    queryKey: ['budgets', budgetId, 'transactions'],
    queryFn: () => fetchBudgetTransactions(budgetId, { page: 1, limit: 100 }),
    enabled: Boolean(budgetId),
  });

  const budget = budgetQuery.data;
  const transactions = transactionsQuery.data?.data ?? [];

  if (budgetQuery.isLoading) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        Loading budget detail...
      </div>
    );
  }

  if (budgetQuery.isError || !budget) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-3">
          <Link href="/budgets">
            <ArrowLeft className="h-4 w-4" />
            Back to budgets
          </Link>
        </Button>
        <div className="rounded-lg border bg-white p-8 text-center text-sm text-red-600 shadow-sm">
          {getApiErrorMessage(budgetQuery.error, 'Unable to load budget detail.')}
        </div>
      </div>
    );
  }

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
            {budget.code} for {budget.department.name}, {budget.period ?? 'No period'}. API-backed budget detail and transaction history.
          </p>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailMetric label="Total Budget" value={formatCurrency(budget.allocatedAmount)} icon={Landmark} />
        <DetailMetric label="Used Budget" value={formatCurrency(getBudgetUsedAmount(budget))} icon={Wallet} />
        <DetailMetric label="Remaining Budget" value={formatCurrency(getRemainingBudget(budget))} icon={Banknote} />
        <DetailMetric label="Period" value={budget.period ?? '-'} icon={CalendarDays} />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Budget Usage</CardTitle>
          <CardDescription>Usage progress turns amber above 80% and red when overspent.</CardDescription>
        </CardHeader>
        <CardContent>
          <BudgetProgress budget={budget} />
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Reserved</div>
              <div className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.reservedAmount)}</div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Committed</div>
              <div className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.committedAmount)}</div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Consumed</div>
              <div className="mt-1 font-semibold text-slate-950">{formatCurrency(budget.consumedAmount)}</div>
            </div>
            <div className="rounded-md border bg-slate-50 p-3">
              <div className="text-slate-500">Usage</div>
              <div className="mt-1 font-semibold text-slate-950">{getBudgetUsage(budget)}%</div>
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
                  <TableHead className="min-w-[190px]">Transaction No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Posted At</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : transactionsQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-red-600">
                      {getApiErrorMessage(transactionsQuery.error, 'Unable to load transaction history.')}
                    </TableCell>
                  </TableRow>
                ) : transactions.length ? (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="font-medium text-slate-900">{transaction.transactionNo}</TableCell>
                      <TableCell>{formatEnum(transaction.type)}</TableCell>
                      <TableCell>{formatEnum(transaction.status)}</TableCell>
                      <TableCell className="min-w-[260px]">{transaction.description ?? '-'}</TableCell>
                      <TableCell>{transaction.occurredAt.slice(0, 10)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(transaction.amount)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-slate-500">
                      No transaction history for this budget.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatEnum(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
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
