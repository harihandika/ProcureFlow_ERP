'use client';

import type React from 'react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Banknote, Landmark, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import { BudgetHealthBadge } from '@/components/budgets/budget-health-badge';
import { BudgetProgress } from '@/components/budgets/budget-progress';
import { ConfirmDialog } from '@/components/data/confirm-dialog';
import { SearchBar } from '@/components/data/search-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  createBudget,
  deactivateBudget,
  fetchBudgets,
  getBudgetUsage,
  getBudgetUsedAmount,
  getRemainingBudget,
  updateBudget,
  type Budget,
  type BudgetPayload,
  type BudgetStatus,
} from '@/lib/budget-api';
import { fetchMasterData } from '@/lib/master-data-api';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { formatCurrency } from '@/lib/utils';

const pageSize = 5;
const allFilter = 'All';
const budgetStatuses: BudgetStatus[] = ['DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED'];

type BudgetFormValues = {
  code: string;
  name: string;
  departmentId: string;
  fiscalYear: string;
  period: string;
  currency: string;
  status: BudgetStatus;
  description: string;
  allocatedAmount: string;
};

const emptyFormValues: BudgetFormValues = {
  code: '',
  name: '',
  departmentId: '',
  fiscalYear: String(new Date().getFullYear()),
  period: 'FY',
  currency: 'IDR',
  status: 'ACTIVE',
  description: '',
  allocatedAmount: '',
};

export default function BudgetsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [departmentId, setDepartmentId] = useState(allFilter);
  const [period, setPeriod] = useState(allFilter);
  const [status, setStatus] = useState<BudgetStatus | typeof allFilter>(allFilter);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [deactivatingBudget, setDeactivatingBudget] = useState<Budget | null>(null);

  const listQuery = useQuery({
    queryKey: ['budgets', { page, search, departmentId, period, status }],
    queryFn: () =>
      fetchBudgets({
        page,
        limit: pageSize,
        search,
        departmentId: departmentId === allFilter ? undefined : departmentId,
        period: period === allFilter ? undefined : period,
        status: status === allFilter ? undefined : status,
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ['budgets', 'summary'],
    queryFn: () => fetchBudgets({ page: 1, limit: 100 }),
  });

  const departmentsQuery = useQuery({
    queryKey: ['master-data', 'departments', 'budget-options'],
    queryFn: () => fetchMasterData('departments', { page: 1, limit: 100, isActive: true }),
  });

  const saveMutation = useMutation({
    mutationFn: (values: BudgetFormValues) =>
      editingBudget ? updateBudget(editingBudget.id, toUpdatePayload(values)) : createBudget(toCreatePayload(values)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      showSuccessToast(`Budget ${editingBudget ? 'updated' : 'created'} successfully.`);
      setFormOpen(false);
      setEditingBudget(null);

      if (!editingBudget) {
        setPage(1);
      }
    },
    onError: (error) => showErrorToast(error, `Unable to ${editingBudget ? 'update' : 'create'} budget.`),
  });

  const deactivateMutation = useMutation({
    mutationFn: (budget: Budget) => deactivateBudget(budget.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['budgets'] });
      showSuccessToast('Budget cancelled successfully.');
      setDeactivatingBudget(null);
      setPage(1);
    },
    onError: (error) => showErrorToast(error, 'Unable to cancel budget. Budgets with usage cannot be cancelled.'),
  });

  const rows = listQuery.data?.data ?? [];
  const meta = listQuery.data?.meta;
  const summaryBudgets = useMemo(() => summaryQuery.data?.data ?? [], [summaryQuery.data?.data]);
  const departments = departmentsQuery.data?.data ?? [];
  const periods = useMemo(() => {
    const values = new Set(summaryBudgets.map((budget) => budget.period).filter(Boolean) as string[]);
    return [allFilter, ...Array.from(values).sort()];
  }, [summaryBudgets]);
  const totalBudget = summaryBudgets.reduce((sum, budget) => sum + budget.allocatedAmount, 0);
  const usedBudget = summaryBudgets.reduce((sum, budget) => sum + getBudgetUsedAmount(budget), 0);
  const remainingBudget = totalBudget - usedBudget;
  const pageCount = Math.max(1, meta?.totalPages ?? 1);
  const currentPage = Math.min(page, pageCount);
  const errorMessage = listQuery.isError ? getApiErrorMessage(listQuery.error, 'Unable to load budgets.') : null;

  function resetPage() {
    setPage(1);
  }

  function openCreateDialog() {
    setEditingBudget(null);
    setFormOpen(true);
  }

  function openEditDialog(budget: Budget) {
    setEditingBudget(budget);
    setFormOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-slate-950">Budget Management</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Monitor allocations, budget usage, overspend risk, and department-level spending activity.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Create Budget
        </Button>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <BudgetSummaryCard
          label="Total Budget"
          value={summaryQuery.isLoading ? '...' : formatCurrency(totalBudget)}
          caption="Current allocation"
          icon={Landmark}
        />
        <BudgetSummaryCard
          label="Used Budget"
          value={summaryQuery.isLoading ? '...' : formatCurrency(usedBudget)}
          caption="Reserved, committed, and consumed"
          icon={Wallet}
        />
        <BudgetSummaryCard
          label="Remaining Budget"
          value={summaryQuery.isLoading ? '...' : formatCurrency(remainingBudget)}
          caption="Available after usage"
          icon={Banknote}
        />
      </section>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle>Budget List</CardTitle>
              <CardDescription>API-backed budgets with department, period, and status filters.</CardDescription>
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
                value={departmentId}
                onValueChange={(value) => {
                  setDepartmentId(value);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full md:w-[210px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allFilter}>All Departments</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
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
                  {periods.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === allFilter ? 'All Periods' : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as BudgetStatus | typeof allFilter);
                  resetPage();
                }}
              >
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={allFilter}>All Status</SelectItem>
                  {budgetStatuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatStatus(option)}
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
                  <TableHead className="w-[150px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-slate-500">
                      Loading budgets...
                    </TableCell>
                  </TableRow>
                ) : errorMessage ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-red-600">
                      {errorMessage}
                    </TableCell>
                  </TableRow>
                ) : rows.length ? (
                  rows.map((budget) => (
                    <TableRow key={budget.id}>
                      <TableCell className="font-medium text-slate-900">{budget.code}</TableCell>
                      <TableCell>
                        <div className="font-medium text-slate-900">{budget.name}</div>
                        <div className="text-xs text-slate-500">Owner: {budget.createdBy?.fullName ?? '-'}</div>
                      </TableCell>
                      <TableCell>{budget.department.name}</TableCell>
                      <TableCell>{budget.period ?? '-'}</TableCell>
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
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${budget.code}`} onClick={() => openEditDialog(budget)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Cancel ${budget.code}`}
                            disabled={budget.status === 'CANCELLED'}
                            onClick={() => setDeactivatingBudget(budget)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                          <Button asChild variant="ghost" size="icon" aria-label={`View ${budget.code}`}>
                            <Link href={`/budgets/${budget.id}`}>
                              <ArrowUpRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-28 text-center text-slate-500">
                      No budgets found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 border-t px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
            <div>
              Showing {rows.length} of {meta?.total ?? 0} budgets
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={currentPage === 1 || listQuery.isLoading} onClick={() => setPage(currentPage - 1)}>
                Previous
              </Button>
              <div className="w-20 text-center font-medium">
                {currentPage} / {pageCount}
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === pageCount || listQuery.isLoading}
                onClick={() => setPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BudgetFormDialog
        open={formOpen}
        budget={editingBudget}
        departments={departments}
        isSubmitting={saveMutation.isPending}
        onOpenChange={(open) => {
          setFormOpen(open);

          if (!open) {
            setEditingBudget(null);
          }
        }}
        onSubmit={(values) => saveMutation.mutate(values)}
      />

      <ConfirmDialog
        open={Boolean(deactivatingBudget)}
        title="Cancel budget"
        description={
          deactivatingBudget
            ? `This will cancel ${deactivatingBudget.code}. Budgets with existing usage cannot be cancelled.`
            : 'This budget will be cancelled.'
        }
        confirmLabel="Cancel Budget"
        isConfirming={deactivateMutation.isPending}
        onOpenChange={(open) => !open && setDeactivatingBudget(null)}
        onConfirm={() => deactivatingBudget && deactivateMutation.mutate(deactivatingBudget)}
      />
    </div>
  );
}

function BudgetFormDialog({
  open,
  budget,
  departments,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  budget: Budget | null;
  departments: Array<{ id: string; code: string; name: string }>;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: BudgetFormValues) => void;
}) {
  const [values, setValues] = useState<BudgetFormValues>(emptyFormValues);
  const isEditing = Boolean(budget);

  useEffect(() => {
    if (!open) {
      return;
    }

    setValues(
      budget
        ? {
            code: budget.code,
            name: budget.name,
            departmentId: budget.departmentId,
            fiscalYear: String(budget.fiscalYear),
            period: budget.period ?? '',
            currency: budget.currency,
            status: budget.status,
            description: budget.description ?? '',
            allocatedAmount: String(budget.allocatedAmount),
          }
        : {
            ...emptyFormValues,
            departmentId: departments[0]?.id ?? '',
          },
    );
  }, [budget, departments, open]);

  function updateField(key: keyof BudgetFormValues, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(values);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${budget?.code}` : 'Create Budget'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update budget metadata and status.' : 'Create a budget with an initial allocation transaction.'}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormInput label="Budget Code" value={values.code} onChange={(value) => updateField('code', value)} required />
            <FormInput label="Budget Name" value={values.name} onChange={(value) => updateField('name', value)} required />
            <div>
              <Label>Department</Label>
              <Select value={values.departmentId} onValueChange={(value) => updateField('departmentId', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.code} - {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FormInput
              label="Fiscal Year"
              type="number"
              value={values.fiscalYear}
              onChange={(value) => updateField('fiscalYear', value)}
              required
            />
            <FormInput label="Period" value={values.period} onChange={(value) => updateField('period', value)} />
            <FormInput label="Currency" value={values.currency} onChange={(value) => updateField('currency', value)} required />
            <div>
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(value) => updateField('status', value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {budgetStatuses.map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatStatus(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!isEditing ? (
              <FormInput
                label="Allocated Amount"
                type="number"
                value={values.allocatedAmount}
                onChange={(value) => updateField('allocatedAmount', value)}
                required
              />
            ) : null}
            <FormInput label="Description" value={values.description} onChange={(value) => updateField('description', value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting || !values.departmentId}>
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        className="mt-2"
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function toCreatePayload(values: BudgetFormValues): BudgetPayload {
  return {
    code: values.code,
    name: values.name,
    departmentId: values.departmentId,
    fiscalYear: Number(values.fiscalYear),
    period: values.period,
    currency: values.currency,
    status: values.status,
    description: values.description,
    allocatedAmount: Number(values.allocatedAmount),
  };
}

function toUpdatePayload(values: BudgetFormValues): Partial<BudgetPayload> {
  return {
    code: values.code,
    name: values.name,
    departmentId: values.departmentId,
    fiscalYear: Number(values.fiscalYear),
    period: values.period,
    currency: values.currency,
    status: values.status,
    description: values.description,
  };
}

function formatStatus(status: BudgetStatus) {
  return status
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ');
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
