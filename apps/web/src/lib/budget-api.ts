import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type BudgetStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type BudgetTransactionType =
  | 'ALLOCATION'
  | 'ADJUSTMENT'
  | 'RESERVATION'
  | 'RELEASE'
  | 'COMMITMENT'
  | 'CONSUMPTION'
  | 'REVERSAL';
export type BudgetTransactionStatus = 'PENDING' | 'POSTED' | 'VOID';

export type Budget = {
  id: string;
  code: string;
  name: string;
  fiscalYear: number;
  period: string | null;
  currency: string;
  status: BudgetStatus;
  description: string | null;
  allocatedAmount: number;
  reservedAmount: number;
  committedAmount: number;
  consumedAmount: number;
  availableAmount: number;
  departmentId: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  createdBy?: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  updatedAt: string;
};

export type BudgetTransaction = {
  id: string;
  transactionNo: string;
  type: BudgetTransactionType;
  status: BudgetTransactionStatus;
  amount: number;
  currency: string;
  description: string | null;
  occurredAt: string;
  createdById?: string | null;
};

export type BudgetListParams = {
  page: number;
  limit: number;
  search?: string;
  departmentId?: string;
  period?: string;
  status?: BudgetStatus;
};

export type BudgetPayload = {
  code: string;
  name: string;
  fiscalYear: number;
  period?: string;
  currency?: string;
  status?: BudgetStatus;
  description?: string;
  allocatedAmount?: number;
  departmentId: string;
};

type ApiBudget = Omit<Budget, 'allocatedAmount' | 'reservedAmount' | 'committedAmount' | 'consumedAmount' | 'availableAmount'> & {
  allocatedAmount: unknown;
  reservedAmount: unknown;
  committedAmount: unknown;
  consumedAmount: unknown;
  availableAmount: unknown;
};

type ApiBudgetTransaction = Omit<BudgetTransaction, 'amount'> & {
  amount: unknown;
};

export async function fetchBudgets(params: BudgetListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiBudget>>('/budgets', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      departmentId: params.departmentId || undefined,
      period: params.period || undefined,
      status: params.status || undefined,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapBudget),
  };
}

export async function fetchBudget(id: string) {
  const response = await apiClient.get<ApiBudget>(`/budgets/${id}`);

  return mapBudget(response.data);
}

export async function createBudget(payload: BudgetPayload) {
  const response = await apiClient.post<ApiBudget>('/budgets', compactBudgetPayload(payload));

  return mapBudget(response.data);
}

export async function updateBudget(id: string, payload: Partial<BudgetPayload>) {
  const response = await apiClient.patch<ApiBudget>(`/budgets/${id}`, compactBudgetPayload(payload));

  return mapBudget(response.data);
}

export async function deactivateBudget(id: string) {
  return updateBudget(id, { status: 'CANCELLED' });
}

export async function fetchBudgetTransactions(id: string, params = { page: 1, limit: 10 }) {
  const response = await apiClient.get<PaginatedApiResponse<ApiBudgetTransaction>>(`/budgets/${id}/transactions`, {
    params,
  });

  return {
    ...response.data,
    data: response.data.data.map(mapBudgetTransaction),
  };
}

export function getBudgetUsedAmount(budget: Budget) {
  return budget.reservedAmount + budget.committedAmount + budget.consumedAmount;
}

export function getBudgetUsage(budget: Budget) {
  return budget.allocatedAmount === 0 ? 0 : Math.round((getBudgetUsedAmount(budget) / budget.allocatedAmount) * 100);
}

export function getRemainingBudget(budget: Budget) {
  return budget.availableAmount;
}

export function getBudgetHealth(budget: Budget): 'normal' | 'warning' | 'danger' {
  if (getRemainingBudget(budget) < 0) {
    return 'danger';
  }

  if (getBudgetUsage(budget) > 80) {
    return 'warning';
  }

  return 'normal';
}

function mapBudget(budget: ApiBudget): Budget {
  return {
    ...budget,
    allocatedAmount: toNumber(budget.allocatedAmount),
    reservedAmount: toNumber(budget.reservedAmount),
    committedAmount: toNumber(budget.committedAmount),
    consumedAmount: toNumber(budget.consumedAmount),
    availableAmount: toNumber(budget.availableAmount),
  };
}

function mapBudgetTransaction(transaction: ApiBudgetTransaction): BudgetTransaction {
  return {
    ...transaction,
    amount: toNumber(transaction.amount),
  };
}

function compactBudgetPayload<T extends Partial<BudgetPayload>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload).map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value]),
  );
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
