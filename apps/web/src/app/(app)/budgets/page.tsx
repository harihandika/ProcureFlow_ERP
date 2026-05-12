'use client';

import type React from 'react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpRight, Banknote, Landmark, Wallet } from 'lucide-react';
import { BudgetHealthBadge } from '@/components/budgets/budget-health-badge';
import { BudgetProgress } from '@/components/budgets/budget-progress';
import { SearchBar } from '@/components/data/search-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  budgetDepartments,
  budgetPeriods,
  budgets,
  getRemainingBudget,
  getBudgetUsage,
} from '@/lib/budget-data';
import { formatCurrency } from '@/lib/utils';

const pageSize = 5;

export default function BudgetsPage() {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All');
  const [period, setPeriod] = useState('All');
  const [page, setPage] = useState(1);

  const filteredBudgets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return budgets.filter((budget) => {
      const matchesSearch = normalizedSearch
        ? [budget.code, budget.name, budget.department, budget.period, budget.owner]
            .join(' ')
            .toLowerCase()
            .includes(normalizedSearch)
        : true;
      const matchesDepartment = department === 'All' ? true : budget.department === department;
      const matchesPeriod = period === 'All' ? true : budget.period === period;

      return matchesSearch && matchesDepartment && matchesPeriod;
    });
  }, [department, period, search]);

  const pageCount = Math.max(1, Math.ceil(filteredBudgets.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = filteredBudgets.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalBudget = filteredBudgets.reduce((sum, budget) => sum + budget.totalBudget, 0);
  const usedBudget = filteredBudgets.reduce((sum, budget) => sum + budget.usedBudget, 0);
  const remainingBudget = totalBudget - usedBudget;

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Budget Management</h1>
        <p className="max-w-3xl text-sm text-slate-600">
          Monitor allocations, budget usage, overspend risk, and department-level spending activity.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <BudgetSummaryCard
          label="Total Budget"
          value={formatCurrency(totalBudget)}
          caption="Filtered allocation"
          icon={Landmark}
        />
        <BudgetSummaryCard label="Used Budget" value={formatCurrency(usedBudget)} caption="Committed and consumed" icon={Wallet} />
        <BudgetSummaryCard
          label="Remaining Budget"
          value={formatCurrency(remainingBudget)}
          caption="Available after usage"
          icon={Banknote}
        />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Budget List</CardTitle>
              <CardDescription>Dummy budgets with department and period filters.</CardDescription>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <SearchBar
                value={search}
                onChange={(value) => {
                  setSearch(value);
                  resetPage();
                }}
                placeholder="Search budget code, department, period"
              />
              <Select
                value={department}
                onValueChange={(value) => {
                  setDepartment(value);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full md:w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetDepartments.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'All' ? 'All Departments' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={period}
                onValueChange={(value) => {
                  setPeriod(value);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetPeriods.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === 'All' ? 'All Periods' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[170px]">Budget Code</TableHead>
                  <TableHead className="min-w-[260px]">Budget Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead className="text-right">Remaining</TableHead>
                  <TableHead className="w-[90px] text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium text-slate-900">{budget.code}</TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{budget.name}</div>
                      <div className="text-xs text-slate-500">Owner: {budget.owner}</div>
                    </TableCell>
                    <TableCell>{budget.department}</TableCell>
                    <TableCell>{budget.period}</TableCell>
                    <TableCell className="min-w-[180px]">
                      <BudgetProgress budget={budget} />
                    </TableCell>
                    <TableCell>
                      <BudgetHealthBadge budget={budget} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="font-medium text-slate-900">{formatCurrency(getRemainingBudget(budget))}</div>
                      <div className="text-xs text-slate-500">{getBudgetUsage(budget)}% used</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="ghost" size="icon" aria-label={`View ${budget.code}`}>
                        <Link href={`/budgets/${budget.id}`}>
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {rows.length} of {filteredBudgets.length} budgets
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
              <div className="w-20 text-center font-medium">
                {currentPage} / {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BudgetSummaryCard({
  label,
  value,
  caption,
  icon: Icon,
}: {
  label: string;
  value: string;
  caption: string;
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
        <CardTitle className="text-2xl">{value}</CardTitle>
        <p className="mt-1 text-xs text-slate-500">{caption}</p>
      </CardContent>
    </Card>
  );
}
