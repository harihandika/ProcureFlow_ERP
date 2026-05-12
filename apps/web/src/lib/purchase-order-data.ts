import { getRequestTotal, purchaseRequests } from '@/lib/purchase-request-data';

export type PurchaseOrderStatus = 'Draft' | 'Issued' | 'Sent' | 'Partially Received' | 'Completed' | 'Cancelled';
export type ErpSyncStatus = 'Not Synced' | 'Pending' | 'Success' | 'Failed';

export type SupplierOption = {
  id: string;
  code: string;
  name: string;
  contact: string;
};

export type PurchaseOrderItem = {
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
};

export type PurchaseOrder = {
  id: string;
  poNo: string;
  prNo: string;
  supplierId: string;
  supplierName: string;
  warehouse: string;
  status: PurchaseOrderStatus;
  erpSyncStatus: ErpSyncStatus;
  expectedDeliveryDate: string;
  createdAt: string;
  sentAt?: string;
  syncedAt?: string;
  items: PurchaseOrderItem[];
};

export const supplierOptions: SupplierOption[] = [
  {
    id: 'supplier-global-tech',
    code: 'SUP-002',
    name: 'PT Global Tech Hardware',
    contact: 'sales@global-tech.test',
  },
  {
    id: 'supplier-nusantara-office',
    code: 'SUP-001',
    name: 'PT Nusantara Office Supplies',
    contact: 'sales@nusantara-supplies.test',
  },
  {
    id: 'supplier-logistik-cepat',
    code: 'SUP-004',
    name: 'PT Logistik Cepat',
    contact: 'ops@logistik-cepat.test',
  },
];

export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-2026-0016',
    poNo: 'PO-2026-0016',
    prNo: 'PR-2026-0013',
    supplierId: 'supplier-global-tech',
    supplierName: 'PT Global Tech Hardware',
    warehouse: 'Main Warehouse',
    status: 'Issued',
    erpSyncStatus: 'Success',
    expectedDeliveryDate: '2026-05-24',
    createdAt: '2026-05-12',
    sentAt: '2026-05-12 10:20',
    syncedAt: '2026-05-12 10:25',
    items: [
      {
        sku: 'ROUTER-ENT-001',
        name: 'Enterprise Router',
        unit: 'PCS',
        quantity: 1,
        unitPrice: 18900000,
      },
    ],
  },
  {
    id: 'po-2026-0015',
    poNo: 'PO-2026-0015',
    prNo: 'PR-2026-0010',
    supplierId: 'supplier-nusantara-office',
    supplierName: 'PT Nusantara Office Supplies',
    warehouse: 'Secondary Warehouse',
    status: 'Sent',
    erpSyncStatus: 'Failed',
    expectedDeliveryDate: '2026-05-21',
    createdAt: '2026-05-11',
    sentAt: '2026-05-11 15:40',
    items: [
      {
        sku: 'PAPER-A4-80G',
        name: 'A4 Copy Paper 80gsm',
        unit: 'BOX',
        quantity: 40,
        unitPrice: 65000,
      },
    ],
  },
  {
    id: 'po-2026-0014',
    poNo: 'PO-2026-0014',
    prNo: 'PR-2026-0009',
    supplierId: 'supplier-global-tech',
    supplierName: 'PT Global Tech Hardware',
    warehouse: 'Main Warehouse',
    status: 'Partially Received',
    erpSyncStatus: 'Success',
    expectedDeliveryDate: '2026-05-18',
    createdAt: '2026-05-09',
    sentAt: '2026-05-09 11:18',
    syncedAt: '2026-05-09 11:25',
    items: [
      {
        sku: 'LAPTOP-STD-001',
        name: 'Standard Business Laptop',
        unit: 'PCS',
        quantity: 5,
        unitPrice: 12500000,
      },
      {
        sku: 'MOUSE-WL-001',
        name: 'Wireless Mouse',
        unit: 'PCS',
        quantity: 5,
        unitPrice: 250000,
      },
    ],
  },
  {
    id: 'po-2026-0013',
    poNo: 'PO-2026-0013',
    prNo: 'PR-2026-0008',
    supplierId: 'supplier-nusantara-office',
    supplierName: 'PT Nusantara Office Supplies',
    warehouse: 'Main Warehouse',
    status: 'Draft',
    erpSyncStatus: 'Not Synced',
    expectedDeliveryDate: '2026-05-26',
    createdAt: '2026-05-08',
    items: [
      {
        sku: 'TONER-BLK-001',
        name: 'Black Printer Toner',
        unit: 'PCS',
        quantity: 3,
        unitPrice: 2150000,
      },
    ],
  },
];

export const approvedPurchaseRequests = purchaseRequests.filter((request) => request.status === 'Approved');

export function getPurchaseOrderTotal(items: PurchaseOrderItem[]) {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function mapApprovedRequestToPoItems(requestId: string): PurchaseOrderItem[] {
  const request = approvedPurchaseRequests.find((item) => item.id === requestId);

  if (!request) {
    return [];
  }

  return request.items.map((item) => ({
    sku: item.sku,
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.estimatedPrice,
  }));
}

export function getApprovedRequestTotal(requestId: string) {
  const request = approvedPurchaseRequests.find((item) => item.id === requestId);
  return request ? getRequestTotal(request.items) : 0;
}
