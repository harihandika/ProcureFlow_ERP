export type ErpSyncStatus = 'Pending' | 'Success' | 'Failed';

export type ErpSyncLog = {
  id: string;
  poNumber: string;
  supplierName: string;
  operation: 'Create PO' | 'Update PO' | 'Cancel PO';
  status: ErpSyncStatus;
  attempts: number;
  syncedAt: string;
  requestedBy: string;
  errorMessage?: string;
};

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SYNC' | 'RETRY';

export type AuditTrail = {
  id: string;
  timestamp: string;
  module: string;
  action: AuditAction;
  user: string;
  entity: string;
  entityId: string;
  summary: string;
  ipAddress: string;
  oldValue?: Record<string, string | number | boolean | null>;
  newValue?: Record<string, string | number | boolean | null>;
};

export const erpSyncLogs: ErpSyncLog[] = [
  {
    id: 'ERP-LOG-1001',
    poNumber: 'PO-2026-0007',
    supplierName: 'PT Sumber Teknologi',
    operation: 'Create PO',
    status: 'Success',
    attempts: 1,
    syncedAt: '2026-05-12 09:20',
    requestedBy: 'Dina Purchasing',
  },
  {
    id: 'ERP-LOG-1002',
    poNumber: 'PO-2026-0008',
    supplierName: 'CV Mega Stationery',
    operation: 'Create PO',
    status: 'Failed',
    attempts: 2,
    syncedAt: '2026-05-12 10:15',
    requestedBy: 'Dina Purchasing',
    errorMessage: 'ERP gateway timeout after 30 seconds.',
  },
  {
    id: 'ERP-LOG-1003',
    poNumber: 'PO-2026-0009',
    supplierName: 'PT Office Prima',
    operation: 'Update PO',
    status: 'Pending',
    attempts: 1,
    syncedAt: '2026-05-12 11:05',
    requestedBy: 'Rafi Purchasing',
  },
  {
    id: 'ERP-LOG-1004',
    poNumber: 'PO-2026-0010',
    supplierName: 'PT Global Hardware',
    operation: 'Create PO',
    status: 'Failed',
    attempts: 1,
    syncedAt: '2026-05-11 16:40',
    requestedBy: 'Rafi Purchasing',
    errorMessage: 'Supplier tax code is missing in ERP master data.',
  },
  {
    id: 'ERP-LOG-1005',
    poNumber: 'PO-2026-0011',
    supplierName: 'PT Sumber Teknologi',
    operation: 'Cancel PO',
    status: 'Success',
    attempts: 1,
    syncedAt: '2026-05-10 14:25',
    requestedBy: 'Dina Purchasing',
  },
];

export const auditTrails: AuditTrail[] = [
  {
    id: 'AUD-9001',
    timestamp: '2026-05-12 09:05',
    module: 'Purchase Request',
    action: 'CREATE',
    user: 'Rina Requester',
    entity: 'PurchaseRequest',
    entityId: 'PR-2026-0018',
    summary: 'Created draft purchase request for IT equipment.',
    ipAddress: '10.20.14.8',
    newValue: {
      status: 'Draft',
      department: 'Information Technology',
      totalAmount: 18750000,
    },
  },
  {
    id: 'AUD-9002',
    timestamp: '2026-05-12 09:35',
    module: 'Approval',
    action: 'APPROVE',
    user: 'Budi Manager',
    entity: 'Approval',
    entityId: 'APR-2026-0041',
    summary: 'Manager approved purchase request PR-2026-0018.',
    ipAddress: '10.20.18.11',
    oldValue: {
      status: 'Submitted',
      currentStep: 'Manager Approval',
    },
    newValue: {
      status: 'Manager Approved',
      currentStep: 'Finance Approval',
    },
  },
  {
    id: 'AUD-9003',
    timestamp: '2026-05-12 10:15',
    module: 'ERP Sync',
    action: 'SYNC',
    user: 'Dina Purchasing',
    entity: 'ErpSyncLog',
    entityId: 'ERP-LOG-1002',
    summary: 'ERP sync failed for PO-2026-0008.',
    ipAddress: '10.20.21.4',
    oldValue: {
      status: 'Pending',
      attempts: 1,
    },
    newValue: {
      status: 'Failed',
      attempts: 2,
      errorMessage: 'ERP gateway timeout after 30 seconds.',
    },
  },
  {
    id: 'AUD-9004',
    timestamp: '2026-05-11 15:20',
    module: 'Budget',
    action: 'UPDATE',
    user: 'Sari Finance',
    entity: 'Budget',
    entityId: 'BUD-2026-IT-Q2',
    summary: 'Adjusted IT department budget for Q2 procurement.',
    ipAddress: '10.20.12.7',
    oldValue: {
      allocatedAmount: 180000000,
      remainingAmount: 124000000,
    },
    newValue: {
      allocatedAmount: 200000000,
      remainingAmount: 144000000,
    },
  },
  {
    id: 'AUD-9005',
    timestamp: '2026-05-10 13:10',
    module: 'Master Data',
    action: 'DELETE',
    user: 'Admin ProcureFlow',
    entity: 'Supplier',
    entityId: 'SUP-OLD-019',
    summary: 'Soft deleted inactive supplier record.',
    ipAddress: '10.20.10.2',
    oldValue: {
      code: 'SUP-OLD-019',
      status: 'Active',
    },
    newValue: {
      code: 'SUP-OLD-019',
      status: 'Inactive',
      deleted: true,
    },
  },
];
