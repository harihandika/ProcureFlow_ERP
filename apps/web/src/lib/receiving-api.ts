import { apiClient } from '@/lib/api-client';
import type { PaginatedApiResponse } from '@/lib/api-types';

export type ReceivingStatus = 'PARTIAL' | 'FULL' | 'CANCELLED';
export type ReceivingStatusLabel = 'Partial' | 'Full' | 'Cancelled';

export type ReceivingItem = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  orderedQuantity: number;
  poQuantityReceived: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  scannedCode: string | null;
  remarks: string | null;
};

export type ReceivingRecord = {
  id: string;
  receivingNumber: string;
  status: ReceivingStatus;
  receivedAt: string;
  deliveryNoteNo: string | null;
  remarks: string | null;
  purchaseOrderId: string;
  purchaseOrder: {
    id: string;
    poNumber: string;
    status: string;
    supplier?: {
      id: string;
      code: string;
      name: string;
    };
  };
  warehouseId: string;
  warehouse: {
    id: string;
    code: string;
    name: string;
  };
  receivedById: string | null;
  receivedBy: {
    id: string;
    email: string;
    fullName: string;
  } | null;
  items: ReceivingItem[];
};

export type CreateReceivingItemPayload = {
  purchaseOrderItemId?: string;
  itemCode?: string;
  quantityReceived: number;
  quantityAccepted?: number;
  quantityRejected?: number;
  remarks?: string;
};

export type CreateReceivingPayload = {
  purchaseOrderId: string;
  warehouseId?: string;
  deliveryNoteNo?: string;
  remarks?: string;
  items: CreateReceivingItemPayload[];
};

export type ReceivingListParams = {
  page: number;
  limit: number;
  search?: string;
  status?: ReceivingStatus;
};

type ApiEntity = Record<string, unknown>;

export async function fetchReceivingRecords(params: ReceivingListParams) {
  const response = await apiClient.get<PaginatedApiResponse<ApiEntity>>('/receiving', {
    params: {
      page: params.page,
      limit: params.limit,
      search: params.search || undefined,
      status: params.status || undefined,
    },
  });

  return {
    ...response.data,
    data: response.data.data.map(mapReceivingRecord),
  };
}

export async function fetchReceivingRecord(id: string) {
  const response = await apiClient.get<ApiEntity>(`/receiving/${id}`);

  return mapReceivingRecord(response.data);
}

export async function createReceiving(payload: CreateReceivingPayload) {
  const response = await apiClient.post<ApiEntity>('/receiving', compactPayload(payload));

  return mapReceivingRecord(response.data);
}

export function getReceivingStatusLabel(status: ReceivingStatus): ReceivingStatusLabel {
  if (status === 'FULL') {
    return 'Full';
  }

  if (status === 'CANCELLED') {
    return 'Cancelled';
  }

  return 'Partial';
}

function mapReceivingRecord(entity: ApiEntity): ReceivingRecord {
  const purchaseOrder = objectValue(entity.purchaseOrder);
  const supplier = objectValue(purchaseOrder?.supplier);
  const warehouse = objectValue(entity.warehouse);
  const receivedBy = objectValue(entity.receivedBy);

  return {
    id: stringValue(entity.id),
    receivingNumber: stringValue(entity.receivingNumber),
    status: stringValue(entity.status, 'PARTIAL') as ReceivingStatus,
    receivedAt: stringValue(entity.receivedAt),
    deliveryNoteNo: nullableString(entity.deliveryNoteNo),
    remarks: nullableString(entity.remarks),
    purchaseOrderId: stringValue(entity.purchaseOrderId),
    purchaseOrder: {
      id: stringValue(purchaseOrder?.id),
      poNumber: stringValue(purchaseOrder?.poNumber),
      status: stringValue(purchaseOrder?.status),
      supplier: supplier
        ? {
            id: stringValue(supplier.id),
            code: stringValue(supplier.code),
            name: stringValue(supplier.name),
          }
        : undefined,
    },
    warehouseId: stringValue(entity.warehouseId),
    warehouse: {
      id: stringValue(warehouse?.id),
      code: stringValue(warehouse?.code),
      name: stringValue(warehouse?.name),
    },
    receivedById: nullableString(entity.receivedById),
    receivedBy: receivedBy
      ? {
          id: stringValue(receivedBy.id),
          email: stringValue(receivedBy.email),
          fullName: stringValue(receivedBy.fullName),
        }
      : null,
    items: Array.isArray(entity.items) ? entity.items.map((item) => mapReceivingItem(objectValue(item))) : [],
  };
}

function mapReceivingItem(entity: ApiEntity | null): ReceivingItem {
  const purchaseOrderItem = objectValue(entity?.purchaseOrderItem);
  const item = objectValue(entity?.item);

  return {
    id: stringValue(entity?.id),
    sku: stringValue(purchaseOrderItem?.itemSkuSnapshot ?? item?.sku),
    name: stringValue(purchaseOrderItem?.itemNameSnapshot ?? item?.name),
    unit: stringValue(purchaseOrderItem?.unitCodeSnapshot),
    orderedQuantity: toNumber(purchaseOrderItem?.quantityOrdered),
    poQuantityReceived: toNumber(purchaseOrderItem?.quantityReceived),
    receivedQuantity: toNumber(entity?.quantityReceived),
    acceptedQuantity: toNumber(entity?.quantityAccepted),
    rejectedQuantity: toNumber(entity?.quantityRejected),
    scannedCode: nullableString(entity?.scannedCode),
    remarks: nullableString(entity?.remarks),
  };
}

function compactPayload(payload: CreateReceivingPayload) {
  return {
    ...Object.fromEntries(
      Object.entries(payload)
        .filter(([key]) => key !== 'items')
        .map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value])
        .filter(([, value]) => value !== undefined),
    ),
    items: payload.items.map((item) =>
      Object.fromEntries(
        Object.entries(item)
          .map(([key, value]) => [key, typeof value === 'string' && value.trim() === '' ? undefined : value])
          .filter(([, value]) => value !== undefined),
      ),
    ),
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

function toNumber(value: unknown) {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
