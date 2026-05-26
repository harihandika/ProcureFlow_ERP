import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type ErpSyncStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
export type ErpSyncStatusLabel = 'Pending' | 'Success' | 'Failed';
export type ErpSyncOperation = 'CREATE_PO' | 'UPDATE_PO' | 'CANCEL_PO';

export type ErpSyncLog = {
  id: string;
  operation: ErpSyncOperation;
  status: ErpSyncStatus;
  statusLabel: ErpSyncStatusLabel;
  attemptNo: number;
  maxAttempts: number;
  externalId: string | null;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  syncedAt: string | null;
  nextRetryAt: string | null;
  purchaseOrderId: string;
  purchaseOrder: {
    id: string;
    poNumber: string;
    status: string;
    erpExternalId: string | null;
    syncedAt: string | null;
  };
  triggeredById: string | null;
  triggeredBy: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  previousSyncLogId: string | null;
  createdAt: string;
};

export type ErpSyncLogListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: Exclude<ErpSyncStatus, 'RETRYING'>;
  purchaseOrderId?: string;
};

type ApiEntity = Record<string, unknown>;

export async function fetchErpSyncLogs(params: ErpSyncLogListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/erp-sync/logs', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
      purchaseOrderId: params.purchaseOrderId || undefined,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapErpSyncLog),
  };
}

export async function syncPurchaseOrderToErp(purchaseOrderId: string) {
  const response = await apiClient.post<ApiEntity>(`/erp-sync/purchase-orders/${purchaseOrderId}`, {});

  return mapErpSyncLog(response.data);
}

export async function retryErpSync(logId: string) {
  const response = await apiClient.post<ApiEntity>(`/erp-sync/retry/${logId}`, {});

  return mapErpSyncLog(response.data);
}

export function getOperationLabel(operation: ErpSyncOperation) {
  if (operation === 'UPDATE_PO') {
    return 'Update PO';
  }

  if (operation === 'CANCEL_PO') {
    return 'Cancel PO';
  }

  return 'Create PO';
}

function mapErpSyncLog(entity: ApiEntity): ErpSyncLog {
  const purchaseOrder = objectValue(entity.purchaseOrder);
  const triggeredBy = objectValue(entity.triggeredBy);
  const status = stringValue(entity.status, 'PENDING') as ErpSyncStatus;

  return {
    id: stringValue(entity.id),
    operation: stringValue(entity.operation, 'CREATE_PO') as ErpSyncOperation,
    status,
    statusLabel: getStatusLabel(status),
    attemptNo: toNumber(entity.attemptNo),
    maxAttempts: toNumber(entity.maxAttempts),
    externalId: nullableString(entity.externalId),
    requestPayload: entity.requestPayload ?? null,
    responsePayload: entity.responsePayload ?? null,
    errorMessage: nullableString(entity.errorMessage),
    syncedAt: nullableString(entity.syncedAt),
    nextRetryAt: nullableString(entity.nextRetryAt),
    purchaseOrderId: stringValue(entity.purchaseOrderId),
    purchaseOrder: {
      id: stringValue(purchaseOrder?.id),
      poNumber: stringValue(purchaseOrder?.poNumber),
      status: stringValue(purchaseOrder?.status),
      erpExternalId: nullableString(purchaseOrder?.erpExternalId),
      syncedAt: nullableString(purchaseOrder?.syncedAt),
    },
    triggeredById: nullableString(entity.triggeredById),
    triggeredBy: triggeredBy
      ? {
          id: stringValue(triggeredBy.id),
          email: stringValue(triggeredBy.email),
          fullName: stringValue(triggeredBy.fullName),
        }
      : null,
    previousSyncLogId: nullableString(entity.previousSyncLogId),
    createdAt: stringValue(entity.createdAt),
  };
}

function getStatusLabel(status: ErpSyncStatus): ErpSyncStatusLabel {
  if (status === 'SUCCESS') {
    return 'Success';
  }

  if (status === 'FAILED') {
    return 'Failed';
  }

  return 'Pending';
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

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
