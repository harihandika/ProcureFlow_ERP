import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type PurchaseOrderStatus = 'DRAFT' | 'ISSUED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
export type PurchaseOrderStatusLabel = 'Draft' | 'Issued' | 'Partially Received' | 'Completed' | 'Cancelled';
export type ErpSyncStatus = 'NOT_SYNCED' | 'PENDING' | 'SUCCESS' | 'FAILED' | 'RETRYING';
export type ErpSyncStatusLabel = 'Not Synced' | 'Pending' | 'Success' | 'Failed' | 'Retrying';

export type PurchaseOrderItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  lineTotal: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  issueDate: string | null;
  expectedDeliveryDate: string | null;
  totalAmount: number;
  currency: string;
  erpSyncStatus: ErpSyncStatus;
  syncedAt: string | null;
  notes: string | null;
  purchaseRequestId: string | null;
  purchaseRequest: {
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    requester?: {
      id: string;
      email: string;
      fullName: string;
    };
    department?: {
      id: string;
      code: string;
      name: string;
    };
    budget?: {
      id: string;
      code: string;
      name: string;
    } | null;
  } | null;
  supplierId: string;
  supplier: {
    id: string;
    code: string;
    name: string;
    contactName: string | null;
    email: string | null;
    phone: string | null;
  };
  warehouseId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  items: PurchaseOrderItem[];
};

export type SupplierOption = {
  id: string;
  code: string;
  name: string;
  contact: string;
};

export type PurchaseOrderListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: PurchaseOrderStatus;
};

type ApiEntity = Record<string, unknown>;

export async function fetchPurchaseOrders(params: PurchaseOrderListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/purchase-orders', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapPurchaseOrder),
  };
}

export async function fetchPurchaseOrder(id: string) {
  const response = await apiClient.get<ApiEntity>(`/purchase-orders/${id}`);

  return mapPurchaseOrder(response.data);
}

export async function generatePurchaseOrderFromPr(prId: string, supplierId: string) {
  const response = await apiClient.post<ApiEntity>(`/purchase-orders/generate-from-pr/${prId}`, { supplierId });

  return mapPurchaseOrder(response.data);
}

export async function updatePurchaseOrderStatus(id: string, status: PurchaseOrderStatus) {
  const response = await apiClient.patch<ApiEntity>(`/purchase-orders/${id}/status`, { status });

  return mapPurchaseOrder(response.data);
}

export async function fetchSupplierOptions() {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/suppliers', {
    params: {
      page: 1,
      limit: 100,
      isActive: true,
    },
  });

  return response.data.data.map(mapSupplierOption);
}

export function getPurchaseOrderStatusLabel(status: PurchaseOrderStatus): PurchaseOrderStatusLabel {
  if (status === 'DRAFT') {
    return 'Draft';
  }

  if (status === 'ISSUED') {
    return 'Issued';
  }

  if (status === 'PARTIALLY_RECEIVED') {
    return 'Partially Received';
  }

  if (status === 'RECEIVED') {
    return 'Completed';
  }

  return 'Cancelled';
}

export function getErpSyncStatusLabel(status: ErpSyncStatus): ErpSyncStatusLabel {
  if (status === 'PENDING') {
    return 'Pending';
  }

  if (status === 'SUCCESS') {
    return 'Success';
  }

  if (status === 'FAILED') {
    return 'Failed';
  }

  if (status === 'RETRYING') {
    return 'Retrying';
  }

  return 'Not Synced';
}

function mapPurchaseOrder(entity: ApiEntity): PurchaseOrder {
  const purchaseRequest = objectValue(entity.purchaseRequest);
  const supplier = objectValue(entity.supplier);
  const warehouse = objectValue(entity.warehouse);

  return {
    id: stringValue(entity.id),
    poNumber: stringValue(entity.poNumber),
    status: stringValue(entity.status, 'DRAFT') as PurchaseOrderStatus,
    issueDate: nullableDate(entity.issueDate),
    expectedDeliveryDate: nullableDate(entity.expectedDeliveryDate),
    totalAmount: toNumber(entity.totalAmount),
    currency: stringValue(entity.currency, 'IDR'),
    erpSyncStatus: stringValue(entity.erpSyncStatus, 'NOT_SYNCED') as ErpSyncStatus,
    syncedAt: nullableString(entity.syncedAt),
    notes: nullableString(entity.notes),
    purchaseRequestId: nullableString(entity.purchaseRequestId),
    purchaseRequest: purchaseRequest
      ? {
          id: stringValue(purchaseRequest.id),
          requestNumber: stringValue(purchaseRequest.requestNumber),
          title: stringValue(purchaseRequest.title),
          status: stringValue(purchaseRequest.status),
          requester: mapUser(objectValue(purchaseRequest.requester)),
          department: mapReference(objectValue(purchaseRequest.department)),
          budget: objectValue(purchaseRequest.budget) ? mapReference(objectValue(purchaseRequest.budget)) : null,
        }
      : null,
    supplierId: stringValue(entity.supplierId),
    supplier: {
      id: stringValue(supplier?.id),
      code: stringValue(supplier?.code),
      name: stringValue(supplier?.name),
      contactName: nullableString(supplier?.contactName),
      email: nullableString(supplier?.email),
      phone: nullableString(supplier?.phone),
    },
    warehouseId: stringValue(entity.warehouseId),
    warehouse: {
      id: stringValue(warehouse?.id),
      code: stringValue(warehouse?.code),
      name: stringValue(warehouse?.name),
    },
    createdAt: stringValue(entity.createdAt),
    updatedAt: stringValue(entity.updatedAt),
    items: Array.isArray(entity.items) ? entity.items.map((item) => mapPurchaseOrderItem(objectValue(item))) : [],
  };
}

function mapPurchaseOrderItem(entity: ApiEntity | null): PurchaseOrderItem {
  return {
    id: stringValue(entity?.id),
    sku: stringValue(entity?.itemSkuSnapshot),
    name: stringValue(entity?.itemNameSnapshot),
    unit: stringValue(entity?.unitCodeSnapshot),
    quantityOrdered: toNumber(entity?.quantityOrdered),
    quantityReceived: toNumber(entity?.quantityReceived),
    unitPrice: toNumber(entity?.unitPrice),
    lineTotal: toNumber(entity?.lineTotal),
  };
}

function mapSupplierOption(entity: ApiEntity): SupplierOption {
  return {
    id: stringValue(entity.id),
    code: stringValue(entity.code),
    name: stringValue(entity.name),
    contact: stringValue(entity.email ?? entity.contactName ?? entity.phone, '-'),
  };
}

function mapUser(entity: ApiEntity | null) {
  return {
    id: stringValue(entity?.id),
    email: stringValue(entity?.email),
    fullName: stringValue(entity?.fullName),
  };
}

function mapReference(entity: ApiEntity | null) {
  return {
    id: stringValue(entity?.id),
    code: stringValue(entity?.code),
    name: stringValue(entity?.name),
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

function nullableDate(value: unknown) {
  return value ? String(value).slice(0, 10) : null;
}

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
