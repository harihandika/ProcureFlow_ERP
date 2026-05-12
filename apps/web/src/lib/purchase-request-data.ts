export type PurchaseRequestStatus = 'Draft' | 'Submitted' | 'Approved' | 'Rejected';

export type RequestItemOption = {
  id: string;
  sku: string;
  name: string;
  unit: string;
  estimatedPrice: number;
};

export type PurchaseRequestItem = {
  itemId: string;
  sku: string;
  name: string;
  unit: string;
  quantity: number;
  estimatedPrice: number;
};

export type PurchaseRequest = {
  id: string;
  prNo: string;
  title: string;
  requester: string;
  department: string;
  budgetCode: string;
  requiredDate: string;
  status: PurchaseRequestStatus;
  items: PurchaseRequestItem[];
  createdAt: string;
};

export const requestItemOptions: RequestItemOption[] = [
  {
    id: 'item-laptop',
    sku: 'LAPTOP-STD-001',
    name: 'Standard Business Laptop',
    unit: 'PCS',
    estimatedPrice: 12500000,
  },
  {
    id: 'item-mouse',
    sku: 'MOUSE-WL-001',
    name: 'Wireless Mouse',
    unit: 'PCS',
    estimatedPrice: 250000,
  },
  {
    id: 'item-paper',
    sku: 'PAPER-A4-80G',
    name: 'A4 Copy Paper 80gsm',
    unit: 'BOX',
    estimatedPrice: 65000,
  },
  {
    id: 'item-router',
    sku: 'ROUTER-ENT-001',
    name: 'Enterprise Router',
    unit: 'PCS',
    estimatedPrice: 18900000,
  },
  {
    id: 'item-toner',
    sku: 'TONER-BLK-001',
    name: 'Black Printer Toner',
    unit: 'PCS',
    estimatedPrice: 2150000,
  },
];

export const purchaseRequests: PurchaseRequest[] = [
  {
    id: 'pr-2026-0014',
    prNo: 'PR-2026-0014',
    title: 'Laptop replacement batch',
    requester: 'Rina Requester',
    department: 'Information Technology',
    budgetCode: 'BGT-IT-2026',
    requiredDate: '2026-05-20',
    status: 'Submitted',
    createdAt: '2026-05-12',
    items: [
      makeItem('item-laptop', 3),
      makeItem('item-mouse', 6),
    ],
  },
  {
    id: 'pr-2026-0013',
    prNo: 'PR-2026-0013',
    title: 'Operations network refresh',
    requester: 'Maya Manager',
    department: 'Operations',
    budgetCode: 'BGT-OPS-2026',
    requiredDate: '2026-05-22',
    status: 'Approved',
    createdAt: '2026-05-11',
    items: [makeItem('item-router', 1)],
  },
  {
    id: 'pr-2026-0012',
    prNo: 'PR-2026-0012',
    title: 'Monthly office supplies',
    requester: 'Faris Finance',
    department: 'Finance',
    budgetCode: 'BGT-FIN-Q2-2026',
    requiredDate: '2026-05-25',
    status: 'Draft',
    createdAt: '2026-05-10',
    items: [
      makeItem('item-paper', 20),
      makeItem('item-toner', 2),
    ],
  },
  {
    id: 'pr-2026-0011',
    prNo: 'PR-2026-0011',
    title: 'Printer toner urgent request',
    requester: 'Rina Requester',
    department: 'Finance',
    budgetCode: 'BGT-FIN-Q2-2026',
    requiredDate: '2026-05-18',
    status: 'Rejected',
    createdAt: '2026-05-09',
    items: [makeItem('item-toner', 1)],
  },
];

export function getRequestTotal(items: Array<{ quantity: number; estimatedPrice: number }>) {
  return items.reduce((sum, item) => sum + item.quantity * item.estimatedPrice, 0);
}

function makeItem(itemId: string, quantity: number): PurchaseRequestItem {
  const option = requestItemOptions.find((item) => item.id === itemId);

  if (!option) {
    throw new Error(`Missing dummy item option ${itemId}`);
  }

  return {
    itemId: option.id,
    sku: option.sku,
    name: option.name,
    unit: option.unit,
    quantity,
    estimatedPrice: option.estimatedPrice,
  };
}
