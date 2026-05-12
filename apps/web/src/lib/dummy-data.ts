import type { WorkflowStatus } from '@/components/status-badge';

export type ModuleRecord = {
  id: string;
  title: string;
  subtitle: string;
  owner: string;
  department: string;
  status: WorkflowStatus;
  amount: number;
  date: string;
  reference: string;
  meta: Record<string, string>;
};

export type ModuleConfig = {
  slug: string;
  title: string;
  description: string;
  primaryAction: string;
  searchPlaceholder: string;
  records: ModuleRecord[];
  drawerTitle: string;
  drawerMode?: 'default' | 'audit' | 'approval';
  formFields: string[];
  metrics: Array<{
    label: string;
    value: string;
    caption: string;
  }>;
};

const baseRecords: ModuleRecord[] = [
  {
    id: 'REC-001',
    title: 'Business Laptop Standard',
    subtitle: 'IT Equipment',
    owner: 'Rina Requester',
    department: 'Information Technology',
    status: 'Draft',
    amount: 12500000,
    date: '2026-05-03',
    reference: 'ITM-LAPTOP-STD',
    meta: {
      Supplier: 'PT Global Tech Hardware',
      Warehouse: 'Main Warehouse',
      Priority: 'Normal',
    },
  },
  {
    id: 'REC-002',
    title: 'Office Copy Paper',
    subtitle: 'Office Supplies',
    owner: 'Maya Manager',
    department: 'Operations',
    status: 'Submitted',
    amount: 6500000,
    date: '2026-05-05',
    reference: 'PR-2026-0008',
    meta: {
      Supplier: 'PT Nusantara Office Supplies',
      Warehouse: 'Secondary Warehouse',
      Priority: 'High',
    },
  },
  {
    id: 'REC-003',
    title: 'Wireless Mouse Bundle',
    subtitle: 'IT Accessories',
    owner: 'Pandu Purchasing',
    department: 'Purchasing',
    status: 'Approved',
    amount: 3750000,
    date: '2026-05-06',
    reference: 'PO-2026-0012',
    meta: {
      Supplier: 'PT Global Tech Hardware',
      Warehouse: 'Main Warehouse',
      Priority: 'Normal',
    },
  },
  {
    id: 'REC-004',
    title: 'Router Replacement',
    subtitle: 'Network Equipment',
    owner: 'Faris Finance',
    department: 'Information Technology',
    status: 'Completed',
    amount: 18900000,
    date: '2026-05-08',
    reference: 'GRN-2026-0010',
    meta: {
      Supplier: 'PT Global Tech Hardware',
      Warehouse: 'Main Warehouse',
      Priority: 'Urgent',
    },
  },
  {
    id: 'REC-005',
    title: 'ERP PO Sync Attempt',
    subtitle: 'Integration',
    owner: 'Pandu Purchasing',
    department: 'Purchasing',
    status: 'Failed',
    amount: 12500000,
    date: '2026-05-09',
    reference: 'ERP-SYNC-009',
    meta: {
      Operation: 'CREATE_PO',
      Attempt: '2 of 3',
      Error: 'Mock ERP temporary failure',
    },
  },
  {
    id: 'REC-006',
    title: 'Printer Toner Request',
    subtitle: 'Office Supplies',
    owner: 'Rina Requester',
    department: 'Finance',
    status: 'Rejected',
    amount: 2150000,
    date: '2026-05-10',
    reference: 'PR-2026-0011',
    meta: {
      Reason: 'Budget limit exceeded',
      Budget: 'FIN-OPS-2026',
      Priority: 'Low',
    },
  },
];

function recordsFor(slug: string, overrides: Partial<ModuleRecord>[] = []) {
  return baseRecords.map((record, index) => ({
    ...record,
    ...overrides[index % overrides.length],
    id: `${slug.toUpperCase().slice(0, 3)}-${String(index + 1).padStart(3, '0')}`,
  }));
}

const commonMetrics = [
  { label: 'Open Records', value: '128', caption: 'Across active departments' },
  { label: 'This Month', value: '42', caption: 'Created in May 2026' },
  { label: 'Completion Rate', value: '86%', caption: 'Closed without rework' },
];

export const moduleConfigs: Record<string, ModuleConfig> = {
  items: {
    slug: 'items',
    title: 'Items',
    description: 'Master catalog for purchasing and budget validation.',
    primaryAction: 'New Item',
    searchPlaceholder: 'Search sku, item, supplier',
    records: recordsFor('items', [
      { title: 'Standard Business Laptop', subtitle: 'IT Equipment', reference: 'LAPTOP-STD-001' },
      { title: 'Wireless Mouse', subtitle: 'IT Accessories', reference: 'MOUSE-WL-001' },
      { title: 'A4 Copy Paper 80gsm', subtitle: 'Office Supplies', reference: 'PAPER-A4-80G' },
    ]),
    drawerTitle: 'Item Detail',
    formFields: ['SKU', 'Item Name', 'Category', 'Default Supplier', 'Packaging Unit', 'Estimated Unit Price'],
    metrics: commonMetrics,
  },
  suppliers: {
    slug: 'suppliers',
    title: 'Suppliers',
    description: 'Vendor profiles, payment terms, and purchasing contacts.',
    primaryAction: 'New Supplier',
    searchPlaceholder: 'Search supplier, code, city',
    records: recordsFor('suppliers', [
      { title: 'PT Nusantara Office Supplies', subtitle: 'Office Supplies', reference: 'SUP-001' },
      { title: 'PT Global Tech Hardware', subtitle: 'IT Hardware', reference: 'SUP-002' },
    ]),
    drawerTitle: 'Supplier Detail',
    formFields: ['Supplier Code', 'Supplier Name', 'Contact Name', 'Email', 'Phone', 'Payment Terms'],
    metrics: commonMetrics,
  },
  departments: {
    slug: 'departments',
    title: 'Departments',
    description: 'Organization units for request ownership and approval scope.',
    primaryAction: 'New Department',
    searchPlaceholder: 'Search department or manager',
    records: recordsFor('departments', [
      { title: 'Information Technology', subtitle: 'Internal technology', reference: 'IT' },
      { title: 'Finance', subtitle: 'Budget control', reference: 'FIN' },
      { title: 'Operations', subtitle: 'Operations purchasing', reference: 'OPS' },
    ]),
    drawerTitle: 'Department Detail',
    formFields: ['Department Code', 'Department Name', 'Manager', 'Description'],
    metrics: commonMetrics,
  },
  warehouses: {
    slug: 'warehouses',
    title: 'Warehouses',
    description: 'Receiving locations and goods handover points.',
    primaryAction: 'New Warehouse',
    searchPlaceholder: 'Search warehouse or code',
    records: recordsFor('warehouses', [
      { title: 'Main Warehouse', subtitle: 'Primary receiving', reference: 'WH-MAIN' },
      { title: 'Secondary Warehouse', subtitle: 'Backup receiving', reference: 'WH-SEC' },
    ]),
    drawerTitle: 'Warehouse Detail',
    formFields: ['Warehouse Code', 'Warehouse Name', 'Address', 'PIC'],
    metrics: commonMetrics,
  },
  'packaging-units': {
    slug: 'packaging-units',
    title: 'Packaging Units',
    description: 'Units used for item ordering and receiving.',
    primaryAction: 'New Unit',
    searchPlaceholder: 'Search unit code or name',
    records: recordsFor('packaging-units', [
      { title: 'Piece', subtitle: 'Single item unit', reference: 'PCS' },
      { title: 'Box', subtitle: 'Box packaging', reference: 'BOX' },
      { title: 'Kilogram', subtitle: 'Weight-based unit', reference: 'KG' },
    ]),
    drawerTitle: 'Packaging Unit Detail',
    formFields: ['Unit Code', 'Unit Name', 'Description'],
    metrics: commonMetrics,
  },
  budgets: {
    slug: 'budgets',
    title: 'Budgets',
    description: 'Department budget allocation, adjustment, and available balance.',
    primaryAction: 'New Budget',
    searchPlaceholder: 'Search budget, department, fiscal year',
    records: recordsFor('budgets', [
      { title: 'IT Department Budget 2026', subtitle: 'FY 2026', reference: 'BGT-IT-2026', amount: 500000000 },
      { title: 'Operations Budget 2026', subtitle: 'FY 2026', reference: 'BGT-OPS-2026', amount: 350000000 },
    ]),
    drawerTitle: 'Budget Detail',
    formFields: ['Budget Code', 'Department', 'Fiscal Year', 'Allocated Amount', 'Currency'],
    metrics: [
      { label: 'Allocated', value: 'IDR 850M', caption: 'Active budget pool' },
      { label: 'Reserved', value: 'IDR 184M', caption: 'Submitted requests' },
      { label: 'Available', value: 'IDR 666M', caption: 'Current balance' },
    ],
  },
  'purchase-requests': {
    slug: 'purchase-requests',
    title: 'Purchase Requests',
    description: 'Requester drafts, budget checks, and submitted procurement requests.',
    primaryAction: 'New PR',
    searchPlaceholder: 'Search PR number, requester, item',
    records: recordsFor('purchase-requests'),
    drawerTitle: 'Purchase Request Detail',
    formFields: ['Required Date', 'Department', 'Priority', 'Item', 'Quantity', 'Budget'],
    metrics: [
      { label: 'Draft', value: '18', caption: 'Not submitted' },
      { label: 'Submitted', value: '24', caption: 'Awaiting approval' },
      { label: 'Approved', value: '39', caption: 'Ready for PO' },
    ],
  },
  approvals: {
    slug: 'approvals',
    title: 'Approval Queue',
    description: 'Manager and finance approvals grouped by department and budget impact.',
    primaryAction: 'Assign Reviewer',
    searchPlaceholder: 'Search requester, department, status',
    records: recordsFor('approval-queue'),
    drawerTitle: 'Approval Detail',
    drawerMode: 'approval',
    formFields: ['Reviewer', 'Approval Level', 'Decision', 'Comment'],
    metrics: [
      { label: 'Manager Queue', value: '16', caption: 'Department review' },
      { label: 'Finance Queue', value: '9', caption: 'Budget review' },
      { label: 'SLA Risk', value: '3', caption: 'Older than 2 days' },
    ],
  },
  'purchase-orders': {
    slug: 'purchase-orders',
    title: 'Purchase Orders',
    description: 'Purchase orders generated from approved requests.',
    primaryAction: 'New PO',
    searchPlaceholder: 'Search PO number, supplier, item',
    records: recordsFor('purchase-orders'),
    drawerTitle: 'Purchase Order Detail',
    formFields: ['PO Number', 'Supplier', 'Warehouse', 'Expected Delivery', 'Currency'],
    metrics: [
      { label: 'Issued', value: '31', caption: 'Sent to suppliers' },
      { label: 'Receiving', value: '12', caption: 'Partially received' },
      { label: 'Closed', value: '44', caption: 'Fully received' },
    ],
  },
  receiving: {
    slug: 'receiving',
    title: 'Receiving',
    description: 'Warehouse receipts with partial receiving and item code scan simulation.',
    primaryAction: 'New Receipt',
    searchPlaceholder: 'Search GRN, PO, item code',
    records: recordsFor('receiving'),
    drawerTitle: 'Receiving Detail',
    formFields: ['PO Number', 'Warehouse', 'Item Code', 'Received Qty', 'Accepted Qty', 'Rejected Qty'],
    metrics: [
      { label: 'Today', value: '14', caption: 'Receipts posted' },
      { label: 'Partial', value: '8', caption: 'Open PO balance' },
      { label: 'Completed', value: '26', caption: 'Fully received' },
    ],
  },
  'erp-sync-logs': {
    slug: 'erp-sync-logs',
    title: 'ERP Sync Logs',
    description: 'Mock ERP integration attempts, failures, and retry history.',
    primaryAction: 'Retry Failed',
    searchPlaceholder: 'Search sync id, PO, error',
    records: recordsFor('erp-sync-logs'),
    drawerTitle: 'ERP Sync Detail',
    drawerMode: 'audit',
    formFields: ['Purchase Order', 'Operation', 'Simulated Status'],
    metrics: [
      { label: 'Success', value: '58', caption: 'Accepted by mock ERP' },
      { label: 'Failed', value: '5', caption: 'Retry allowed' },
      { label: 'Retry Rate', value: '92%', caption: 'Recovered failures' },
    ],
  },
  'audit-trails': {
    slug: 'audit-trails',
    title: 'Audit Trails',
    description: 'Recorded user actions for controlled procurement operations.',
    primaryAction: 'Export',
    searchPlaceholder: 'Search actor, entity, action',
    records: recordsFor('audit-trails'),
    drawerTitle: 'Audit Detail',
    drawerMode: 'audit',
    formFields: ['Action', 'Entity Type', 'Actor', 'Date Range'],
    metrics: [
      { label: 'Events Today', value: '214', caption: 'Recorded actions' },
      { label: 'ERP Events', value: '37', caption: 'Sync and retry' },
      { label: 'Admin Events', value: '19', caption: 'Master data changes' },
    ],
  },
};
