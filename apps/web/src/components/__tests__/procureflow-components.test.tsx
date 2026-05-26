import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginForm } from '@/components/auth/login-form';
import { AppShell } from '@/components/layout/app-shell';
import DashboardPage from '@/app/(app)/dashboard/page';
import { DataTable, type DataTableColumn } from '@/components/data/data-table';
import { FormModal, type FormField } from '@/components/data/form-modal';
import { StatusBadge } from '@/components/status-badge';
import { PurchaseRequestForm } from '@/components/purchase-requests/purchase-request-form';
import { ApprovalQueue } from '@/components/approvals/approval-queue';
import type { MasterDataRecord } from '@/lib/master-data';

const { mockAuthValue, mockNavigation, mockFetchMasterData, mockFetchBudgets, mockFetchMyApprovalQueue } = vi.hoisted(() => ({
  mockAuthValue: {
    user: null as null | { id: string; email: string; fullName: string; roles: string[] },
    status: 'unauthenticated',
    isAuthenticated: false,
    isLoggingIn: false,
    loginError: null as string | null,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  },
  mockNavigation: {
    pathname: '/dashboard',
    replace: vi.fn(),
    refresh: vi.fn(),
  },
  mockFetchMasterData: vi.fn(),
  mockFetchBudgets: vi.fn(),
  mockFetchMyApprovalQueue: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => mockNavigation.pathname,
  useRouter: () => ({
    replace: mockNavigation.replace,
    refresh: mockNavigation.refresh,
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockAuthValue,
}));

vi.mock('@/components/dashboard/dashboard-charts', () => ({
  PRStatusChart: () => <div>PR chart</div>,
  POStatusChart: () => <div>PO chart</div>,
}));

vi.mock('@/lib/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

vi.mock('@/lib/master-data-api', () => ({
  fetchMasterData: mockFetchMasterData,
}));

vi.mock('@/lib/budget-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/budget-api')>('@/lib/budget-api');

  return {
    ...actual,
    fetchBudgets: mockFetchBudgets,
  };
});

vi.mock('@/lib/purchase-request-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/purchase-request-api')>('@/lib/purchase-request-api');

  return {
    ...actual,
    createPurchaseRequest: vi.fn(),
    updatePurchaseRequest: vi.fn(),
    submitPurchaseRequest: vi.fn(),
  };
});

vi.mock('@/lib/approval-api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/approval-api')>('@/lib/approval-api');

  return {
    ...actual,
    fetchMyApprovalQueue: mockFetchMyApprovalQueue,
    approveApproval: vi.fn(),
    rejectApproval: vi.fn(),
  };
});

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const departmentRecord: MasterDataRecord = {
  id: 'dept-1',
  code: 'IT',
  name: 'Information Technology',
  type: 'Technology',
  owner: '-',
  location: '-',
  contact: '-',
  status: 'Active',
  updatedAt: '2026-05-13',
};

const itemRecord: MasterDataRecord = {
  id: 'item-1',
  code: 'LAPTOP-STD-001',
  name: 'Standard Business Laptop',
  type: 'IT Equipment',
  owner: '-',
  location: 'PCS',
  contact: '-',
  status: 'Active',
  updatedAt: '2026-05-13',
  defaultPackagingUnitId: 'unit-1',
  estimatedUnitPrice: '100',
};

function mockPurchaseRequestOptions(remainingBudget = 1000) {
  mockFetchMasterData.mockImplementation((module: string) => {
    if (module === 'departments') {
      return Promise.resolve({ data: [departmentRecord], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    }

    return Promise.resolve({ data: [itemRecord], meta: { page: 1, limit: 100, total: 1, totalPages: 1 } });
  });

  mockFetchBudgets.mockResolvedValue({
    data: [
      {
        id: 'budget-1',
        code: 'BGT-IT-2026',
        name: 'IT Budget',
        fiscalYear: 2026,
        period: 'FY',
        currency: 'IDR',
        status: 'ACTIVE',
        allocatedAmount: 1000,
        reservedAmount: 0,
        committedAmount: 0,
        consumedAmount: 1000 - remainingBudget,
        availableAmount: remainingBudget,
        departmentId: 'dept-1',
        department: { id: 'dept-1', code: 'IT', name: 'Information Technology' },
        updatedAt: '2026-05-13',
      },
    ],
    meta: { page: 1, limit: 100, total: 1, totalPages: 1 },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigation.pathname = '/dashboard';
  mockAuthValue.user = null;
  mockAuthValue.status = 'unauthenticated';
  mockAuthValue.isAuthenticated = false;
  mockAuthValue.isLoggingIn = false;
  mockAuthValue.loginError = null;
});

describe('ProcureFlow component tests', () => {
  it('renders the login form correctly', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows login form validation errors', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    await user.clear(screen.getByLabelText(/email/i));
    await user.type(screen.getByLabelText(/email/i), 'not-an-email');
    await user.clear(screen.getByLabelText(/password/i));
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    expect(await screen.findByText(/enter a valid email address/i)).toBeInTheDocument();
    expect(await screen.findByText(/password must be at least 8 characters/i)).toBeInTheDocument();
  });

  it('renders sidebar menu items based on role', () => {
    mockAuthValue.user = {
      id: 'user-1',
      email: 'requester@procureflow.test',
      fullName: 'Rina Requester',
      roles: ['REQUESTER'],
    };
    mockAuthValue.status = 'authenticated';
    mockAuthValue.isAuthenticated = true;

    render(
      <AppShell>
        <div>Page body</div>
      </AppShell>,
    );

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getByText('Purchase Requests')).toBeInTheDocument();
    expect(screen.queryByText('Items')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Trails')).not.toBeInTheDocument();
  });

  it('renders dashboard summary cards', () => {
    render(<DashboardPage />);

    expect(screen.getByText('Total Budget')).toBeInTheDocument();
    expect(screen.getByText('Used Budget')).toBeInTheDocument();
    expect(screen.getByText('Remaining Budget')).toBeInTheDocument();
    expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
  });

  it('renders data table rows', () => {
    const rows = [departmentRecord];
    const columns: DataTableColumn[] = [
      { key: 'code', label: 'Code' },
      { key: 'name', label: 'Name' },
      { key: 'status', label: 'Status' },
    ];

    render(
      <DataTable
        rows={rows}
        columns={columns}
        search=""
        status="All"
        page={1}
        pageSize={10}
        createLabel="Create"
        searchPlaceholder="Search"
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onPageChange={vi.fn()}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText('IT')).toBeInTheDocument();
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
  });

  it('opens and closes create/edit modal', async () => {
    const user = userEvent.setup();
    const fields: FormField[] = [{ key: 'code', label: 'Code' }];

    function ModalHarness() {
      const [open, setOpen] = useState(false);

      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open modal
          </button>
          <FormModal
            open={open}
            title="Create Department"
            description="Create record"
            fields={fields}
            record={null}
            onOpenChange={setOpen}
            onSubmit={vi.fn()}
          />
        </>
      );
    }

    render(<ModalHarness />);

    await user.click(screen.getByRole('button', { name: /open modal/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('displays status badge text for a status', () => {
    render(<StatusBadge status="Approved" />);

    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('can add purchase request item rows', async () => {
    const user = userEvent.setup();
    mockPurchaseRequestOptions();

    renderWithQuery(<PurchaseRequestForm />);

    await waitFor(() => expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled());
    expect(screen.getAllByLabelText(/quantity/i)).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByLabelText(/quantity/i)).toHaveLength(2);
  });

  it('can remove purchase request item rows', async () => {
    const user = userEvent.setup();
    mockPurchaseRequestOptions();

    renderWithQuery(<PurchaseRequestForm />);

    await waitFor(() => expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled());
    await user.click(screen.getByRole('button', { name: /add item/i }));
    expect(screen.getAllByLabelText(/quantity/i)).toHaveLength(2);

    await user.click(screen.getAllByRole('button', { name: /remove item row/i })[1]);
    expect(screen.getAllByLabelText(/quantity/i)).toHaveLength(1);
  });

  it('calculates purchase request subtotal and grand total', async () => {
    const user = userEvent.setup();
    mockPurchaseRequestOptions();

    renderWithQuery(<PurchaseRequestForm />);

    await waitFor(() => expect(screen.getByRole('button', { name: /add item/i })).toBeEnabled());
    const quantityInput = screen.getByLabelText(/quantity/i);
    const priceInput = screen.getByLabelText(/estimated price/i);
    await user.clear(priceInput);
    await user.type(priceInput, '100');
    await user.clear(quantityInput);
    await user.type(quantityInput, '3');

    await waitFor(() => {
      const normalizedPageText = document.body.textContent?.replace(/\s|\u00a0/g, '') ?? '';
      expect(normalizedPageText).toContain('Rp300');
    });
  });

  it('shows budget warning when total exceeds remaining budget', async () => {
    mockPurchaseRequestOptions(50);

    renderWithQuery(<PurchaseRequestForm />);

    expect(await screen.findByText(/request exceeds remaining budget/i)).toBeInTheDocument();
    expect(screen.getByText('Over Budget')).toBeInTheDocument();
  });

  it('requires reject reason before allowing rejection submit', async () => {
    const user = userEvent.setup();
    mockAuthValue.user = {
      id: 'manager-1',
      email: 'manager@procureflow.test',
      fullName: 'Maya Manager',
      roles: ['MANAGER'],
    };
    mockFetchMyApprovalQueue.mockResolvedValue([
      {
        id: 'approval-1',
        status: 'SUBMITTED',
        canAct: true,
        rejectReason: null,
        purchaseRequest: {
          id: 'pr-1',
          requestNumber: 'PR-2026-0001',
          title: 'Laptop request',
          description: 'Need laptop',
          status: 'SUBMITTED',
          priority: 'NORMAL',
          requiredDate: '2026-05-20',
          submittedAt: '2026-05-13T00:00:00.000Z',
          totalAmount: 100,
          currency: 'IDR',
          requesterId: 'requester-1',
          requester: { id: 'requester-1', email: 'requester@procureflow.test', fullName: 'Rina Requester' },
          departmentId: 'dept-1',
          department: { id: 'dept-1', code: 'IT', name: 'Information Technology' },
          budgetId: 'budget-1',
          budget: {
            id: 'budget-1',
            code: 'BGT-IT-2026',
            name: 'IT Budget',
            status: 'ACTIVE',
            allocatedAmount: 1000,
            reservedAmount: 100,
            committedAmount: 0,
            consumedAmount: 0,
            currency: 'IDR',
          },
          items: [
            {
              id: 'line-1',
              itemId: 'item-1',
              packagingUnitId: 'unit-1',
              sku: 'LAPTOP-STD-001',
              name: 'Standard Business Laptop',
              unitCode: 'PCS',
              unitName: 'Piece',
              quantity: 1,
              estimatedUnitPrice: 100,
              lineTotal: 100,
            },
          ],
          createdAt: '2026-05-13T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
        timeline: [],
      },
    ]);

    renderWithQuery(<ApprovalQueue />);

    await screen.findAllByText('PR-2026-0001');
    await user.click(screen.getByRole('button', { name: /^reject$/i }));

    const dialog = screen.getByRole('dialog');
    const submitButton = within(dialog).getByRole('button', { name: /submit rejection/i });
    expect(submitButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/reject reason/i), 'ok');
    expect(submitButton).toBeDisabled();

    await user.type(within(dialog).getByLabelText(/reject reason/i), ' needs revision');
    expect(submitButton).toBeEnabled();
  });
});
