import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'SUBMIT'
  | 'RECEIVE'
  | 'SYNC_ERP'
  | 'RETRY_ERP_SYNC';

export type AuditEntityType =
  | 'USER'
  | 'ROLE'
  | 'DEPARTMENT'
  | 'ITEM'
  | 'SUPPLIER'
  | 'WAREHOUSE'
  | 'PACKAGING_UNIT'
  | 'BUDGET'
  | 'BUDGET_TRANSACTION'
  | 'PURCHASE_REQUEST'
  | 'PURCHASE_ORDER'
  | 'RECEIVING'
  | 'ERP_SYNC_LOG'
  | 'SYSTEM';

export type AuditTrail = {
  id: string;
  action: AuditAction;
  actionLabel: string;
  entityType: AuditEntityType;
  moduleLabel: string;
  entityId: string | null;
  entityLabel: string | null;
  actorId: string | null;
  actor: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  before: unknown;
  after: unknown;
  metadata: unknown;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

export type AuditTrailListParams = {
  page: number;
  limit: number;
  search?: string;
  action?: AuditAction;
  entityType?: AuditEntityType;
  actorId?: string;
  date?: string;
};

export const auditEntityTypeOptions: Array<{ value: AuditEntityType; label: string }> = [
  { value: 'USER', label: 'Users' },
  { value: 'ROLE', label: 'Roles' },
  { value: 'DEPARTMENT', label: 'Departments' },
  { value: 'ITEM', label: 'Items' },
  { value: 'SUPPLIER', label: 'Suppliers' },
  { value: 'WAREHOUSE', label: 'Warehouses' },
  { value: 'PACKAGING_UNIT', label: 'Packaging Units' },
  { value: 'BUDGET', label: 'Budgets' },
  { value: 'BUDGET_TRANSACTION', label: 'Budget Transactions' },
  { value: 'PURCHASE_REQUEST', label: 'Purchase Requests' },
  { value: 'PURCHASE_ORDER', label: 'Purchase Orders' },
  { value: 'RECEIVING', label: 'Receiving' },
  { value: 'ERP_SYNC_LOG', label: 'ERP Sync Logs' },
  { value: 'SYSTEM', label: 'System' },
];

export const auditActionOptions: Array<{ value: AuditAction; label: string }> = [
  { value: 'CREATE', label: 'Create' },
  { value: 'UPDATE', label: 'Update' },
  { value: 'DELETE', label: 'Delete' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'SUBMIT', label: 'Submit' },
  { value: 'RECEIVE', label: 'Receive' },
  { value: 'SYNC_ERP', label: 'Sync ERP' },
  { value: 'RETRY_ERP_SYNC', label: 'Retry ERP Sync' },
];

type ApiEntity = Record<string, unknown>;

export async function fetchAuditTrails(params: AuditTrailListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/audit-trails', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      action: params.action || undefined,
      entityType: params.entityType || undefined,
      actorId: params.actorId || undefined,
      ...(params.date ? getDateRangeParams(params.date) : {}),
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapAuditTrail),
  };
}

export function getModuleLabel(entityType: AuditEntityType) {
  return auditEntityTypeOptions.find((option) => option.value === entityType)?.label ?? entityType;
}

export function getActionLabel(action: AuditAction) {
  return auditActionOptions.find((option) => option.value === action)?.label ?? action;
}

function mapAuditTrail(entity: ApiEntity): AuditTrail {
  const actor = objectValue(entity.actor);
  const action = stringValue(entity.action, 'UPDATE') as AuditAction;
  const entityType = stringValue(entity.entityType, 'SYSTEM') as AuditEntityType;

  return {
    id: stringValue(entity.id),
    action,
    actionLabel: getActionLabel(action),
    entityType,
    moduleLabel: getModuleLabel(entityType),
    entityId: nullableString(entity.entityId),
    entityLabel: nullableString(entity.entityLabel),
    actorId: nullableString(entity.actorId),
    actor: actor
      ? {
          id: stringValue(actor.id),
          email: stringValue(actor.email),
          fullName: stringValue(actor.fullName),
        }
      : null,
    before: entity.before ?? null,
    after: entity.after ?? null,
    metadata: entity.metadata ?? null,
    ipAddress: nullableString(entity.ipAddress),
    userAgent: nullableString(entity.userAgent),
    createdAt: stringValue(entity.createdAt),
  };
}

function getDateRangeParams(date: string) {
  const start = new Date(`${date}T00:00:00.000`);
  const end = new Date(`${date}T23:59:59.999`);

  return {
    dateFrom: start.toISOString(),
    dateTo: end.toISOString(),
  };
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
