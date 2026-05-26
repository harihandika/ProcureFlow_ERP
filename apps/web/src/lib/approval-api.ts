import { apiClient } from '@/lib/api-client';
import { mapPurchaseRequest, type PurchaseRequest, type PurchaseRequestStatus } from '@/lib/purchase-request-api';

export type ApprovalTimelineStatus = 'COMPLETED' | 'PENDING' | 'WAITING' | 'REJECTED';

export type ApprovalTimelineStep = {
  label: string;
  actor: string;
  status: ApprovalTimelineStatus;
  date: string | null;
  note: string | null;
};

export type ApprovalQueueItem = {
  id: string;
  status: PurchaseRequestStatus;
  canAct: boolean;
  rejectReason: string | null;
  purchaseRequest: PurchaseRequest;
  timeline: ApprovalTimelineStep[];
};

type ApiEntity = Record<string, unknown>;

export async function fetchMyApprovalQueue() {
  const response = await apiClient.get<ApiEntity[]>('/approvals/my-queue');

  return response.data.map(mapApprovalQueueItem);
}

export async function approveApproval(id: string) {
  const response = await apiClient.post<ApiEntity>(`/approvals/${id}/approve`);

  return mapApprovalQueueItem(response.data);
}

export async function rejectApproval(id: string, reason: string) {
  const response = await apiClient.post<ApiEntity>(`/approvals/${id}/reject`, { reason });

  return mapApprovalQueueItem(response.data);
}

function mapApprovalQueueItem(entity: ApiEntity): ApprovalQueueItem {
  return {
    id: stringValue(entity.id),
    status: stringValue(entity.status, 'SUBMITTED') as PurchaseRequestStatus,
    canAct: Boolean(entity.canAct),
    rejectReason: nullableString(entity.rejectReason),
    purchaseRequest: mapPurchaseRequest(objectValue(entity.purchaseRequest) ?? {}),
    timeline: Array.isArray(entity.timeline) ? entity.timeline.map((step) => mapTimelineStep(objectValue(step))) : [],
  };
}

function mapTimelineStep(entity: ApiEntity | null): ApprovalTimelineStep {
  return {
    label: stringValue(entity?.label),
    actor: stringValue(entity?.actor),
    status: stringValue(entity?.status, 'WAITING') as ApprovalTimelineStatus,
    date: nullableString(entity?.date),
    note: nullableString(entity?.note),
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
