import type { WorkflowStatus } from '@/components/status-badge';

export type ApprovalStepStatus = 'Completed' | 'Pending' | 'Waiting' | 'Rejected';

export type ApprovalTimelineStep = {
  label: string;
  actor: string;
  status: ApprovalStepStatus;
  date?: string;
  note?: string;
};

export type ApprovalRequest = {
  id: string;
  prNo: string;
  title: string;
  requester: string;
  department: string;
  submittedDate: string;
  totalAmount: number;
  status: WorkflowStatus;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  budgetCode: string;
  reason: string;
  items: Array<{
    sku: string;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  timeline: ApprovalTimelineStep[];
  rejectReason?: string;
};

export const approvalRequests: ApprovalRequest[] = [
  {
    id: 'apr-pr-2026-0014',
    prNo: 'PR-2026-0014',
    title: 'Laptop replacement batch',
    requester: 'Rina Requester',
    department: 'Information Technology',
    submittedDate: '2026-05-12',
    totalAmount: 39000000,
    status: 'Pending',
    priority: 'High',
    budgetCode: 'BGT-IT-2026',
    reason: 'Replace aging laptops for engineering onboarding.',
    items: [
      { sku: 'LAPTOP-STD-001', name: 'Standard Business Laptop', quantity: 3, unitPrice: 12500000 },
      { sku: 'MOUSE-WL-001', name: 'Wireless Mouse', quantity: 6, unitPrice: 250000 },
    ],
    timeline: [
      { label: 'Submitted', actor: 'Rina Requester', status: 'Completed', date: '2026-05-12 09:10' },
      { label: 'Manager Approval', actor: 'Maya Manager', status: 'Pending' },
      { label: 'Finance Approval', actor: 'Faris Finance', status: 'Waiting' },
    ],
  },
  {
    id: 'apr-pr-2026-0013',
    prNo: 'PR-2026-0013',
    title: 'Operations network refresh',
    requester: 'Maya Manager',
    department: 'Operations',
    submittedDate: '2026-05-11',
    totalAmount: 18900000,
    status: 'Approved',
    priority: 'Normal',
    budgetCode: 'BGT-OPS-2026',
    reason: 'Upgrade router in operations control room.',
    items: [{ sku: 'ROUTER-ENT-001', name: 'Enterprise Router', quantity: 1, unitPrice: 18900000 }],
    timeline: [
      { label: 'Submitted', actor: 'Maya Manager', status: 'Completed', date: '2026-05-11 10:22' },
      { label: 'Manager Approval', actor: 'Oka Operations', status: 'Completed', date: '2026-05-11 13:40' },
      { label: 'Finance Approval', actor: 'Faris Finance', status: 'Completed', date: '2026-05-11 16:05' },
    ],
  },
  {
    id: 'apr-pr-2026-0012',
    prNo: 'PR-2026-0012',
    title: 'Monthly office supplies',
    requester: 'Faris Finance',
    department: 'Finance',
    submittedDate: '2026-05-10',
    totalAmount: 5600000,
    status: 'Submitted',
    priority: 'Normal',
    budgetCode: 'BGT-FIN-Q2-2026',
    reason: 'Monthly replenishment for finance shared workspace.',
    items: [
      { sku: 'PAPER-A4-80G', name: 'A4 Copy Paper 80gsm', quantity: 20, unitPrice: 65000 },
      { sku: 'TONER-BLK-001', name: 'Black Printer Toner', quantity: 2, unitPrice: 2150000 },
    ],
    timeline: [
      { label: 'Submitted', actor: 'Faris Finance', status: 'Completed', date: '2026-05-10 11:45' },
      { label: 'Manager Approval', actor: 'Finance Manager', status: 'Pending' },
      { label: 'Finance Approval', actor: 'Faris Finance', status: 'Waiting' },
    ],
  },
  {
    id: 'apr-pr-2026-0011',
    prNo: 'PR-2026-0011',
    title: 'Printer toner urgent request',
    requester: 'Rina Requester',
    department: 'Finance',
    submittedDate: '2026-05-09',
    totalAmount: 2150000,
    status: 'Rejected',
    priority: 'Low',
    budgetCode: 'BGT-FIN-Q2-2026',
    reason: 'Urgent replacement for printer toner.',
    rejectReason: 'Duplicate request. Existing toner stock is available.',
    items: [{ sku: 'TONER-BLK-001', name: 'Black Printer Toner', quantity: 1, unitPrice: 2150000 }],
    timeline: [
      { label: 'Submitted', actor: 'Rina Requester', status: 'Completed', date: '2026-05-09 15:12' },
      {
        label: 'Manager Approval',
        actor: 'Finance Manager',
        status: 'Rejected',
        date: '2026-05-10 09:20',
        note: 'Duplicate request.',
      },
      { label: 'Finance Approval', actor: 'Faris Finance', status: 'Waiting' },
    ],
  },
];

export const approvalDepartments = ['All', ...Array.from(new Set(approvalRequests.map((request) => request.department)))];
export const approvalStatuses: Array<'All' | WorkflowStatus> = [
  'All',
  'Submitted',
  'Pending',
  'Approved',
  'Rejected',
];
