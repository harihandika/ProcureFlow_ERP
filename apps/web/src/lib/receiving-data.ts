import { purchaseOrders, type PurchaseOrder } from '@/lib/purchase-order-data';

export type ReceivingStatus = 'Partial' | 'Full' | 'Cancelled';

export type ReceivingItem = {
  sku: string;
  name: string;
  orderedQuantity: number;
  previouslyReceived: number;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
};

export type ReceivingRecord = {
  id: string;
  receivingNo: string;
  poNo: string;
  supplierName: string;
  warehouse: string;
  receivedBy: string;
  receivedAt: string;
  status: ReceivingStatus;
  deliveryNoteNo: string;
  items: ReceivingItem[];
};

export const receivablePurchaseOrders: PurchaseOrder[] = purchaseOrders.filter((order) =>
  ['Issued', 'Sent', 'Partially Received'].includes(order.status),
);

export const receivingRecords: ReceivingRecord[] = [
  {
    id: 'grn-2026-0012',
    receivingNo: 'GRN-2026-0012',
    poNo: 'PO-2026-0016',
    supplierName: 'PT Global Tech Hardware',
    warehouse: 'Main Warehouse',
    receivedBy: 'Wahyu Warehouse',
    receivedAt: '2026-05-12 13:20',
    status: 'Full',
    deliveryNoteNo: 'DN-GTH-2026-077',
    items: [
      {
        sku: 'ROUTER-ENT-001',
        name: 'Enterprise Router',
        orderedQuantity: 1,
        previouslyReceived: 0,
        receivedQuantity: 1,
        acceptedQuantity: 1,
        rejectedQuantity: 0,
      },
    ],
  },
  {
    id: 'grn-2026-0011',
    receivingNo: 'GRN-2026-0011',
    poNo: 'PO-2026-0014',
    supplierName: 'PT Global Tech Hardware',
    warehouse: 'Main Warehouse',
    receivedBy: 'Wahyu Warehouse',
    receivedAt: '2026-05-11 15:40',
    status: 'Partial',
    deliveryNoteNo: 'DN-GTH-2026-071',
    items: [
      {
        sku: 'LAPTOP-STD-001',
        name: 'Standard Business Laptop',
        orderedQuantity: 5,
        previouslyReceived: 0,
        receivedQuantity: 3,
        acceptedQuantity: 3,
        rejectedQuantity: 0,
      },
      {
        sku: 'MOUSE-WL-001',
        name: 'Wireless Mouse',
        orderedQuantity: 5,
        previouslyReceived: 0,
        receivedQuantity: 5,
        acceptedQuantity: 5,
        rejectedQuantity: 0,
      },
    ],
  },
  {
    id: 'grn-2026-0010',
    receivingNo: 'GRN-2026-0010',
    poNo: 'PO-2026-0015',
    supplierName: 'PT Nusantara Office Supplies',
    warehouse: 'Secondary Warehouse',
    receivedBy: 'Dina Warehouse',
    receivedAt: '2026-05-10 10:05',
    status: 'Partial',
    deliveryNoteNo: 'DN-NOS-2026-044',
    items: [
      {
        sku: 'PAPER-A4-80G',
        name: 'A4 Copy Paper 80gsm',
        orderedQuantity: 40,
        previouslyReceived: 0,
        receivedQuantity: 18,
        acceptedQuantity: 18,
        rejectedQuantity: 0,
      },
    ],
  },
];

export function getPreviouslyReceivedQuantity(poNo: string, sku: string) {
  return receivingRecords
    .filter((record) => record.poNo === poNo && record.status !== 'Cancelled')
    .flatMap((record) => record.items)
    .filter((item) => item.sku === sku)
    .reduce((sum, item) => sum + item.receivedQuantity, 0);
}

export function getReceivingStatusFromItems(
  items: Array<{ orderedQuantity: number; previouslyReceived: number; receivedQuantity: number }>,
): ReceivingStatus {
  const isFull = items.every((item) => item.previouslyReceived + item.receivedQuantity >= item.orderedQuantity);
  return isFull ? 'Full' : 'Partial';
}
