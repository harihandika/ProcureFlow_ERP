import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type PurchaseRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type PurchaseRequestPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export type PurchaseRequestLine = {
  id: string;
  itemId: string;
  packagingUnitId: string;
  sku: string;
  name: string;
  unitCode: string;
  unitName: string;
  quantity: number;
  estimatedUnitPrice: number;
  lineTotal: number;
  description?: string | null;
  notes?: string | null;
};

export type PurchaseRequest = {
  id: string;
  requestNumber: string;
  title: string;
  description?: string | null;
  status: PurchaseRequestStatus;
  priority: PurchaseRequestPriority;
  requiredDate?: string | null;
  submittedAt?: string | null;
  totalAmount: number;
  currency: string;
  requesterId: string;
  requester: {
    id: string;
    email: string;
    fullName: string;
  };
  departmentId: string;
  department: {
    id: string;
    code: string;
    name: string;
  };
  budgetId?: string | null;
  budget?: {
    id: string;
    code: string;
    name: string;
    status: string;
    allocatedAmount: number;
    reservedAmount: number;
    committedAmount: number;
    consumedAmount: number;
    currency: string;
  } | null;
  items: PurchaseRequestLine[];
  createdAt: string;
  updatedAt: string;
};

export type PurchaseRequestItemPayload = {
  itemId: string;
  packagingUnitId: string;
  quantity: number;
  estimatedUnitPrice: number;
  description?: string;
  notes?: string;
};

export type PurchaseRequestPayload = {
  title: string;
  description?: string;
  priority?: PurchaseRequestPriority;
  requiredDate?: string;
  departmentId?: string;
  budgetId?: string;
  items?: PurchaseRequestItemPayload[];
};

export type PurchaseRequestListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: PurchaseRequestStatus;
  departmentId?: string;
  budgetId?: string;
};

type ApiEntity = Record<string, unknown>;

export async function fetchPurchaseRequests(params: PurchaseRequestListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/purchase-requests', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
      departmentId: params.departmentId || undefined,
      budgetId: params.budgetId || undefined,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapPurchaseRequest),
  };
}

export async function fetchPurchaseRequest(id: string) {
  const response = await apiClient.get<ApiEntity>(`/purchase-requests/${id}`);

  return mapPurchaseRequest(response.data);
}

export async function createPurchaseRequest(payload: PurchaseRequestPayload) {
  const response = await apiClient.post<ApiEntity>('/purchase-requests', compactPayload(payload));

  return mapPurchaseRequest(response.data);
}

export async function updatePurchaseRequest(id: string, payload: PurchaseRequestPayload) {
  const response = await apiClient.patch<ApiEntity>(`/purchase-requests/${id}`, compactPayload(payload));

  return mapPurchaseRequest(response.data);
}

export async function submitPurchaseRequest(id: string, budgetId?: string) {
  const response = await apiClient.post<ApiEntity>(`/purchase-requests/${id}/submit`, compactPayload({ budgetId }));

  return mapPurchaseRequest(response.data);
}

export function getRequestTotal(items: Array<{ quantity: number; estimatedUnitPrice: number }>) {
  return items.reduce((sum, item) => sum + item.quantity * item.estimatedUnitPrice, 0);
}

export function getStatusLabel(status: PurchaseRequestStatus) {
  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'SUBMITTED') {
    return 'Submitted';
  }

  if (status === 'APPROVED') {
    return 'Approved';
  }

  if (status === 'REJECTED') {
    return 'Rejected';
  }

  return 'Cancelled';
}

export function mapPurchaseRequest(entity: ApiEntity): PurchaseRequest {
  const budget = objectValue(entity.budget);

  return {
    id: stringValue(entity.id),
    requestNumber: stringValue(entity.requestNumber),
    title: stringValue(entity.title),
    description: nullableString(entity.description),
    status: stringValue(entity.status, 'DRAFT') as PurchaseRequestStatus,
    priority: stringValue(entity.priority, 'NORMAL') as PurchaseRequestPriority,
    requiredDate: nullableDate(entity.requiredDate),
    submittedAt: nullableDate(entity.submittedAt),
    totalAmount: toNumber(entity.totalAmount),
    currency: stringValue(entity.currency, 'IDR'),
    requesterId: stringValue(entity.requesterId),
    requester: mapUser(objectValue(entity.requester)),
    departmentId: stringValue(entity.departmentId),
    department: mapReference(objectValue(entity.department)),
    budgetId: nullableString(entity.budgetId),
    budget: budget
      ? {
          id: stringValue(budget.id),
          code: stringValue(budget.code),
          name: stringValue(budget.name),
          status: stringValue(budget.status),
          allocatedAmount: toNumber(budget.allocatedAmount),
          reservedAmount: toNumber(budget.reservedAmount),
          committedAmount: toNumber(budget.committedAmount),
          consumedAmount: toNumber(budget.consumedAmount),
          currency: stringValue(budget.currency, 'IDR'),
        }
      : null,
    items: Array.isArray(entity.items) ? entity.items.map((item) => mapPurchaseRequestLine(objectValue(item))) : [],
    createdAt: stringValue(entity.createdAt),
    updatedAt: stringValue(entity.updatedAt),
  };
}

function mapPurchaseRequestLine(entity: ApiEntity | null): PurchaseRequestLine {
  const item = objectValue(entity?.item);
  const packagingUnit = objectValue(entity?.packagingUnit);

  return {
    id: stringValue(entity?.id),
    itemId: stringValue(entity?.itemId ?? item?.id),
    packagingUnitId: stringValue(entity?.packagingUnitId ?? packagingUnit?.id),
    sku: stringValue(entity?.itemSkuSnapshot ?? item?.sku),
    name: stringValue(entity?.itemNameSnapshot ?? item?.name),
    unitCode: stringValue(entity?.unitCodeSnapshot ?? packagingUnit?.code),
    unitName: stringValue(entity?.unitNameSnapshot ?? packagingUnit?.name),
    quantity: toNumber(entity?.quantity),
    estimatedUnitPrice: toNumber(entity?.estimatedUnitPrice),
    lineTotal: toNumber(entity?.lineTotal),
    description: nullableString(entity?.description),
    notes: nullableString(entity?.notes),
  };
}

function mapReference(entity: ApiEntity | null) {
  return {
    id: stringValue(entity?.id),
    code: stringValue(entity?.code),
    name: stringValue(entity?.name),
  };
}

function mapUser(entity: ApiEntity | null) {
  return {
    id: stringValue(entity?.id),
    email: stringValue(entity?.email),
    fullName: stringValue(entity?.fullName),
  };
}

function compactPayload<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(
    Object.entries(payload)
      .map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value])
      .filter(([, value]) => value !== undefined),
  );
}

function objectValue(value: unknown) {
  return value && typeof value === 'object' ? (value as ApiEntity) : null;
}

function nullableString(value: unknown) {
  return value === undefined || value === null ? null : String(value);
}

function stringValue(value: unknown, fallback = '') {
  return value === undefined || value === null ? fallback : String(value);
}

function nullableDate(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
