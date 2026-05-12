export type Budget = {
  id: string;
  code: string;
  name: string;
  department: string;
  period: string;
  fiscalYear: number;
  totalBudget: number;
  usedBudget: number;
  reservedBudget: number;
  owner: string;
  updatedAt: string;
};

export type BudgetTransaction = {
  id: string;
  budgetId: string;
  transactionNo: string;
  type: 'Allocation' | 'Adjustment' | 'Reservation' | 'Commitment' | 'Consumption' | 'Release';
  reference: string;
  amount: number;
  createdBy: string;
  postedAt: string;
  description: string;
};

export const budgets: Budget[] = [
  {
    id: 'bgt-it-2026',
    code: 'BGT-IT-2026',
    name: 'IT Department Budget 2026',
    department: 'Information Technology',
    period: 'FY 2026',
    fiscalYear: 2026,
    totalBudget: 500000000,
    usedBudget: 318000000,
    reservedBudget: 74000000,
    owner: 'Faris Finance',
    updatedAt: '2026-05-12',
  },
  {
    id: 'bgt-ops-2026',
    code: 'BGT-OPS-2026',
    name: 'Operations Budget 2026',
    department: 'Operations',
    period: 'FY 2026',
    fiscalYear: 2026,
    totalBudget: 350000000,
    usedBudget: 292000000,
    reservedBudget: 31000000,
    owner: 'Faris Finance',
    updatedAt: '2026-05-11',
  },
  {
    id: 'bgt-fin-q2-2026',
    code: 'BGT-FIN-Q2-2026',
    name: 'Finance Q2 Operating Budget',
    department: 'Finance',
    period: 'Q2 2026',
    fiscalYear: 2026,
    totalBudget: 125000000,
    usedBudget: 132000000,
    reservedBudget: 12000000,
    owner: 'Faris Finance',
    updatedAt: '2026-05-10',
  },
  {
    id: 'bgt-pur-q2-2026',
    code: 'BGT-PUR-Q2-2026',
    name: 'Purchasing Q2 Budget',
    department: 'Purchasing',
    period: 'Q2 2026',
    fiscalYear: 2026,
    totalBudget: 150000000,
    usedBudget: 73000000,
    reservedBudget: 18000000,
    owner: 'Faris Finance',
    updatedAt: '2026-05-08',
  },
  {
    id: 'bgt-wh-2026',
    code: 'BGT-WH-2026',
    name: 'Warehouse Equipment Budget',
    department: 'Warehouse',
    period: 'FY 2026',
    fiscalYear: 2026,
    totalBudget: 220000000,
    usedBudget: 76000000,
    reservedBudget: 24000000,
    owner: 'Faris Finance',
    updatedAt: '2026-05-06',
  },
];

export const budgetTransactions: BudgetTransaction[] = [
  {
    id: 'txn-001',
    budgetId: 'bgt-it-2026',
    transactionNo: 'ALLOC-BGT-IT-2026',
    type: 'Allocation',
    reference: 'FIN-ALLOC-001',
    amount: 500000000,
    createdBy: 'Faris Finance',
    postedAt: '2026-01-02',
    description: 'Initial annual allocation',
  },
  {
    id: 'txn-002',
    budgetId: 'bgt-it-2026',
    transactionNo: 'RSV-PR-2026-0014',
    type: 'Reservation',
    reference: 'PR-2026-0014',
    amount: -37500000,
    createdBy: 'Rina Requester',
    postedAt: '2026-05-12',
    description: 'Reserved for laptop replacement request',
  },
  {
    id: 'txn-003',
    budgetId: 'bgt-it-2026',
    transactionNo: 'COM-PO-2026-0012',
    type: 'Commitment',
    reference: 'PO-2026-0012',
    amount: -18850000,
    createdBy: 'Pandu Purchasing',
    postedAt: '2026-05-10',
    description: 'Committed for approved hardware PO',
  },
  {
    id: 'txn-004',
    budgetId: 'bgt-ops-2026',
    transactionNo: 'ALLOC-BGT-OPS-2026',
    type: 'Allocation',
    reference: 'FIN-ALLOC-002',
    amount: 350000000,
    createdBy: 'Faris Finance',
    postedAt: '2026-01-02',
    description: 'Initial annual allocation',
  },
  {
    id: 'txn-005',
    budgetId: 'bgt-ops-2026',
    transactionNo: 'CON-GRN-2026-0010',
    type: 'Consumption',
    reference: 'GRN-2026-0010',
    amount: -64000000,
    createdBy: 'Wahyu Warehouse',
    postedAt: '2026-05-09',
    description: 'Consumed after goods receiving',
  },
  {
    id: 'txn-006',
    budgetId: 'bgt-fin-q2-2026',
    transactionNo: 'ADJ-FIN-Q2-001',
    type: 'Adjustment',
    reference: 'FIN-ADJ-004',
    amount: -15000000,
    createdBy: 'Faris Finance',
    postedAt: '2026-04-16',
    description: 'Budget adjustment after quarter review',
  },
  {
    id: 'txn-007',
    budgetId: 'bgt-fin-q2-2026',
    transactionNo: 'RSV-PR-2026-0011',
    type: 'Reservation',
    reference: 'PR-2026-0011',
    amount: -2150000,
    createdBy: 'Faris Finance',
    postedAt: '2026-05-10',
    description: 'Reserved for toner request',
  },
  {
    id: 'txn-008',
    budgetId: 'bgt-pur-q2-2026',
    transactionNo: 'REL-PR-2026-0009',
    type: 'Release',
    reference: 'PR-2026-0009',
    amount: 8500000,
    createdBy: 'Faris Finance',
    postedAt: '2026-05-07',
    description: 'Released cancelled PR reservation',
  },
  {
    id: 'txn-009',
    budgetId: 'bgt-wh-2026',
    transactionNo: 'RSV-PR-2026-0007',
    type: 'Reservation',
    reference: 'PR-2026-0007',
    amount: -24000000,
    createdBy: 'Wahyu Warehouse',
    postedAt: '2026-05-05',
    description: 'Reserved for receiving scanner procurement',
  },
];

export function getBudgetUsage(budget: Budget) {
  return budget.totalBudget === 0 ? 0 : Math.round((budget.usedBudget / budget.totalBudget) * 100);
}

export function getRemainingBudget(budget: Budget) {
  return budget.totalBudget - budget.usedBudget;
}

export function getBudgetHealth(budget: Budget): 'normal' | 'warning' | 'danger' {
  if (getRemainingBudget(budget) < 0) {
    return 'danger';
  }

  if (getBudgetUsage(budget) >= 80) {
    return 'warning';
  }

  return 'normal';
}

export const budgetDepartments = ['All', ...Array.from(new Set(budgets.map((budget) => budget.department)))];
export const budgetPeriods = ['All', ...Array.from(new Set(budgets.map((budget) => budget.period)))];
