import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApprovalQueue } from '@/components/approvals/approval-queue';
import { AuthProvider, useAuth } from '@/components/auth/auth-provider';
import { LoginForm } from '@/components/auth/login-form';
import { AuditTrails } from '@/components/audit-trails/audit-trails';
import { ErpSyncLogs } from '@/components/erp-sync/erp-sync-logs';
import { GeneratePOForm } from '@/components/purchase-orders/generate-po-form';
import { PurchaseRequestForm } from '@/components/purchase-requests/purchase-request-form';
import { ReceivingForm } from '@/components/receiving/receiving-form';
import BudgetsPage from '@/app/(app)/budgets/page';
import PurchaseOrdersPage from '@/app/(app)/purchase-orders/page';
import ReceivingPage from '@/app/(app)/receiving/page';
import PurchaseRequestsPage from '@/app/(app)/purchase-requests/page';
import { MasterDataPage } from '@/components/master-data/master-data-page';
import { masterDataConfigs } from '@/lib/master-data';
import { setAuthSession } from '@/lib/auth';

const {
  mockRouter,
  mockRedirectToLogin,
  mockShowErrorToast,
  mockShowSuccessToast,
} = vi.hoisted(() => ({
  mockRouter: {
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  },
  mockRedirectToLogin: vi.fn(),
  mockShowErrorToast: vi.fn(),
  mockShowSuccessToast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard',
}));

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/auth')>('@/lib/auth');

  return {
    ...actual,
    redirectToLogin: mockRedirectToLogin,
  };
});

vi.mock('@/lib/toast', () => ({
  showErrorToast: mockShowErrorToast,
  showSuccessToast: mockShowSuccessToast,
}));

const apiBaseUrl = 'http://localhost:3001/api';
const server = setupServer();
const capturedRequests: Array<{ method: string; path: string; body: unknown }> = [];

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());

beforeEach(() => {
  server.resetHandlers(...defaultHandlers());
  capturedRequests.length = 0;
  mockRouter.push.mockClear();
  mockRouter.replace.mockClear();
  mockRouter.refresh.mockClear();
  mockRedirectToLogin.mockClear();
  mockShowErrorToast.mockClear();
  mockShowSuccessToast.mockClear();
  window.sessionStorage.clear();
  window.history.pushState({}, '', '/dashboard');
});

describe('API-connected frontend components', () => {
  it('connects the auth login form to POST /auth/login and stores the session', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <AuthProvider>
        <LoginForm />
      </AuthProvider>,
    );

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/auth/login',
            body: { email: 'admin@procureflow.test', password: 'Password123!' },
          }),
        ]),
      );
      expect(window.sessionStorage.getItem('procureflow.accessToken')).toBe('access-token');
      expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('fetches the current auth user from GET /auth/me with the bearer token', async () => {
    setAuthSession({ accessToken: 'access-token', user: authUser });

    renderWithProviders(
      <AuthProvider>
        <AuthStatusProbe />
      </AuthProvider>,
    );

    expect(await screen.findByText('Admin User')).toBeInTheDocument();
    expect(capturedRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'GET',
          path: '/api/auth/me',
        }),
      ]),
    );
  });

  it('renders loading, error, empty, and success states from API list responses', async () => {
    server.use(
      http.get(`${apiBaseUrl}/departments`, async ({ request }) => {
        captureRequest(request);
        await delay(120);
        return paginatedJson([department]);
      }),
    );

    const { unmount } = renderWithProviders(<MasterDataPage config={masterDataConfigs.departments} />);
    expect(screen.getByText('Loading records...')).toBeInTheDocument();
    expect(await screen.findByText('Information Technology')).toBeInTheDocument();
    unmount();

    server.resetHandlers(
      http.get(`${apiBaseUrl}/departments`, ({ request }) => {
        captureRequest(request);
        return HttpResponse.json({ message: 'Unable to load departments.' }, { status: 500 });
      }),
    );

    const errorView = renderWithProviders(<MasterDataPage config={masterDataConfigs.departments} />);
    expect(await screen.findByText('Unable to load departments.')).toBeInTheDocument();
    errorView.unmount();

    server.resetHandlers(
      http.get(`${apiBaseUrl}/departments`, ({ request }) => {
        captureRequest(request);
        return paginatedJson([]);
      }),
    );

    renderWithProviders(<MasterDataPage config={masterDataConfigs.departments} />);
    expect(await screen.findByText('No records found.')).toBeInTheDocument();
  });

  it('runs master data create, update, and delete mutations successfully', async () => {
    const user = userEvent.setup();
    const departments = [{ ...department }];
    server.use(...masterDataHandlers(departments));

    renderWithProviders(<MasterDataPage config={masterDataConfigs.departments} />);
    expect(await screen.findByText('Information Technology')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /create department/i }));
    await user.type(screen.getByLabelText(/department code/i), 'FIN');
    await user.type(screen.getByLabelText(/department name/i), 'Finance');
    await user.type(screen.getByLabelText(/function/i), 'Finance operations');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockShowSuccessToast).toHaveBeenCalledWith('Departments record created successfully.'));
    expect(capturedRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'POST',
          path: '/api/departments',
          body: expect.objectContaining({ code: 'FIN', name: 'Finance' }),
        }),
      ]),
    );

    await user.click(await screen.findByRole('button', { name: /edit fin/i }));
    const departmentNameInput = screen.getByLabelText(/department name/i);
    await user.clear(departmentNameInput);
    await user.type(departmentNameInput, 'Finance Shared Services');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => expect(mockShowSuccessToast).toHaveBeenCalledWith('Departments record updated successfully.'));
    expect(capturedRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'PATCH',
          path: '/api/departments/dept-2',
          body: expect.objectContaining({ name: 'Finance Shared Services' }),
        }),
      ]),
    );

    await user.click(await screen.findByRole('button', { name: /delete fin/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /^delete$/i }));

    await waitFor(() => expect(mockShowSuccessToast).toHaveBeenCalledWith('Departments record deleted successfully.'));
    expect(capturedRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: 'DELETE',
          path: '/api/departments/dept-2',
        }),
      ]),
    );
  });

  it('renders API-backed Budget, PR, PO, Receiving, ERP Sync, and Audit Trail views', async () => {
    renderWithProviders(<BudgetsPage />);
    expect(await screen.findByText('BGT-IT-2026')).toBeInTheDocument();

    renderWithProviders(
      <AuthProvider>
        <PurchaseRequestsPage />
      </AuthProvider>,
    );
    expect(await screen.findByText('PR-2026-0001')).toBeInTheDocument();

    renderWithProviders(<PurchaseOrdersPage />);
    expect(await screen.findByText('PO-2026-0001')).toBeInTheDocument();

    renderWithProviders(<ReceivingPage />);
    expect(await screen.findAllByText('RCV-2026-0001')).not.toHaveLength(0);

    renderWithProviders(<ErpSyncLogs />);
    expect(await screen.findByText('sync-log-1')).toBeInTheDocument();

    renderWithProviders(<AuditTrails />);
    expect(await screen.findByText('Budget Management')).toBeInTheDocument();
  });

  it('submits a purchase request form to POST /purchase-requests', async () => {
    const user = userEvent.setup();
    renderWithProviders(<PurchaseRequestForm />);

    await waitFor(() => expect(screen.getByRole('button', { name: /save as draft/i })).toBeEnabled());
    await user.type(screen.getByLabelText(/request title/i), 'Laptop batch');
    await user.type(screen.getByLabelText(/required date/i), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /save as draft/i }));

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/purchase-requests',
            body: expect.objectContaining({
              title: 'Laptop batch',
              departmentId: 'dept-1',
              budgetId: 'budget-1',
            }),
          }),
        ]),
      );
    });
  });

  it('approves approval queue items through POST /approvals/:id/approve', async () => {
    const user = userEvent.setup();
    setAuthSession({ accessToken: 'manager-token', user: managerUser });

    renderWithProviders(
      <AuthProvider>
        <ApprovalQueue />
      </AuthProvider>,
    );

    await screen.findAllByText('PR-2026-0001');
    await user.click(screen.getByRole('button', { name: /^approve$/i }));

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/approvals/approval-1/approve',
          }),
        ]),
      );
      expect(mockShowSuccessToast).toHaveBeenCalledWith('Purchase request approved.');
    });
  });

  it('generates a purchase order from an approved purchase request', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GeneratePOForm />);

    await screen.findByText('Standard Business Laptop');
    await user.click(screen.getByRole('button', { name: /generate draft po/i }));

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/purchase-orders/generate-from-pr/pr-1',
            body: { supplierId: 'supplier-1' },
          }),
        ]),
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/purchase-orders/po-2');
    });
  });

  it('creates a receiving record from the receiving form', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReceivingForm />);

    await screen.findByText('Standard Business Laptop');
    const quantityInputs = screen.getAllByRole('spinbutton');
    await user.clear(quantityInputs[0]);
    await user.type(quantityInputs[0], '2');
    await user.click(screen.getByRole('button', { name: /submit receiving/i }));

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            method: 'POST',
            path: '/api/receiving',
            body: expect.objectContaining({
              purchaseOrderId: 'po-1',
              items: [expect.objectContaining({ purchaseOrderItemId: 'po-item-1', quantityReceived: 2 })],
            }),
          }),
        ]),
      );
      expect(mockRouter.push).toHaveBeenCalledWith('/receiving/receiving-2');
    });
  });

  it('syncs and retries ERP sync logs through API mutations', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ErpSyncLogs />);

    await screen.findByText('sync-log-1');
    await user.click(screen.getByRole('button', { name: /sync po/i }));
    await user.click(screen.getAllByRole('button', { name: /retry/i })[0]);

    await waitFor(() => {
      expect(capturedRequests).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ method: 'POST', path: '/api/erp-sync/purchase-orders/po-1' }),
          expect.objectContaining({ method: 'POST', path: '/api/erp-sync/retry/sync-log-1' }),
        ]),
      );
    });
  });

  it('opens audit trail details with old and new values from the API response', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AuditTrails />);

    await screen.findByText('Budget Management');
    await user.click(screen.getByRole('button', { name: /view/i }));

    expect(await screen.findByText('Old Value')).toBeInTheDocument();
    expect(screen.getByText('New Value')).toBeInTheDocument();
    expect(screen.getByText(/old budget/i)).toBeInTheDocument();
    expect(screen.getByText(/new budget/i)).toBeInTheDocument();
  });

  it('redirects unauthorized API responses to login through the Axios interceptor', async () => {
    setAuthSession({ accessToken: 'expired-token', user: authUser });
    window.history.pushState({}, '', '/budgets');
    server.use(
      http.get(`${apiBaseUrl}/budgets`, ({ request }) => {
        captureRequest(request);
        return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
      }),
    );

    renderWithProviders(<BudgetsPage />);

    await waitFor(() => {
      expect(mockRedirectToLogin).toHaveBeenCalledWith('/budgets');
      expect(window.sessionStorage.getItem('procureflow.accessToken')).toBeNull();
    });
  });
});

function AuthStatusProbe() {
  const { user, status } = useAuth();

  return <div>{status === 'loading' ? 'Loading auth user...' : user?.fullName ?? 'No user'}</div>;
}

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function defaultHandlers() {
  return [
    http.post(`${apiBaseUrl}/auth/login`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ accessToken: 'access-token', user: authUser });
    }),
    http.get(`${apiBaseUrl}/auth/me`, ({ request }) => {
      captureRequest(request);
      return HttpResponse.json(authUser);
    }),
    ...masterDataHandlers([{ ...department }]),
    http.get(`${apiBaseUrl}/items`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([item]);
    }),
    http.get(`${apiBaseUrl}/suppliers`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([supplier]);
    }),
    http.get(`${apiBaseUrl}/warehouses`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([warehouse]);
    }),
    http.get(`${apiBaseUrl}/packaging-units`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([packagingUnit]);
    }),
    http.get(`${apiBaseUrl}/budgets`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([budget]);
    }),
    http.get(`${apiBaseUrl}/purchase-requests`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([purchaseRequest]);
    }),
    http.post(`${apiBaseUrl}/purchase-requests`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...purchaseRequest, id: 'pr-2', requestNumber: 'PR-2026-0002' }, { status: 201 });
    }),
    http.post(`${apiBaseUrl}/purchase-requests/:id/submit`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...purchaseRequest, status: 'SUBMITTED' });
    }),
    http.get(`${apiBaseUrl}/approvals/my-queue`, ({ request }) => {
      captureRequest(request);
      return HttpResponse.json([approvalQueueItem]);
    }),
    http.post(`${apiBaseUrl}/approvals/:id/approve`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...approvalQueueItem, status: 'APPROVED', canAct: false });
    }),
    http.post(`${apiBaseUrl}/approvals/:id/reject`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...approvalQueueItem, status: 'REJECTED', canAct: false, rejectReason: 'Needs revision' });
    }),
    http.get(`${apiBaseUrl}/purchase-orders`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([purchaseOrder]);
    }),
    http.post(`${apiBaseUrl}/purchase-orders/generate-from-pr/:prId`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...purchaseOrder, id: 'po-2', poNumber: 'PO-2026-0002' }, { status: 201 });
    }),
    http.get(`${apiBaseUrl}/receiving`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([receivingRecord]);
    }),
    http.post(`${apiBaseUrl}/receiving`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...receivingRecord, id: 'receiving-2', receivingNumber: 'RCV-2026-0002' }, { status: 201 });
    }),
    http.get(`${apiBaseUrl}/erp-sync/logs`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([erpSyncLog]);
    }),
    http.post(`${apiBaseUrl}/erp-sync/purchase-orders/:id`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...erpSyncLog, id: 'sync-log-2', status: 'SUCCESS', errorMessage: null }, { status: 201 });
    }),
    http.post(`${apiBaseUrl}/erp-sync/retry/:id`, async ({ request }) => {
      await captureRequest(request);
      return HttpResponse.json({ ...erpSyncLog, id: 'sync-log-3', status: 'SUCCESS', errorMessage: null }, { status: 201 });
    }),
    http.get(`${apiBaseUrl}/audit-trails`, ({ request }) => {
      captureRequest(request);
      return paginatedJson([auditTrail]);
    }),
  ];
}

function masterDataHandlers(departments: Array<Record<string, unknown>>) {
  return [
    http.get(`${apiBaseUrl}/departments`, ({ request }) => {
      captureRequest(request);
      return paginatedJson(departments);
    }),
    http.post(`${apiBaseUrl}/departments`, async ({ request }) => {
      const body = (await captureRequest(request)) as Record<string, unknown>;
      const created = {
        ...department,
        ...body,
        id: 'dept-2',
        updatedAt: '2026-05-13T00:00:00.000Z',
      };
      departments.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
    http.patch(`${apiBaseUrl}/departments/:id`, async ({ request, params }) => {
      const body = (await captureRequest(request)) as Record<string, unknown>;
      const index = departments.findIndex((record) => record.id === params.id);
      departments[index] = { ...departments[index], ...body };
      return HttpResponse.json(departments[index]);
    }),
    http.delete(`${apiBaseUrl}/departments/:id`, ({ request, params }) => {
      captureRequest(request);
      const index = departments.findIndex((record) => record.id === params.id);
      const [deleted] = departments.splice(index, 1);
      return HttpResponse.json(deleted);
    }),
  ];
}

async function captureRequest(request: Request) {
  const url = new URL(request.url);
  let body: unknown = undefined;

  if (!['GET', 'HEAD'].includes(request.method)) {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  }

  capturedRequests.push({ method: request.method, path: url.pathname, body });
  return body;
}

function paginatedJson(data: unknown[]) {
  return HttpResponse.json({
    data,
    meta: {
      page: 1,
      limit: 100,
      total: data.length,
      totalPages: 1,
    },
  });
}

const authUser = {
  id: 'admin-1',
  email: 'admin@procureflow.test',
  fullName: 'Admin User',
  departmentId: null,
  roles: ['ADMIN'],
};

const managerUser = {
  id: 'manager-1',
  email: 'manager@procureflow.test',
  fullName: 'Maya Manager',
  departmentId: 'dept-1',
  roles: ['MANAGER'],
};

const department = {
  id: 'dept-1',
  code: 'IT',
  name: 'Information Technology',
  description: 'Technology',
  isActive: true,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const packagingUnit = {
  id: 'unit-1',
  code: 'PCS',
  name: 'Piece',
  description: 'Standard unit',
  isActive: true,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const item = {
  id: 'item-1',
  sku: 'LAPTOP-STD-001',
  name: 'Standard Business Laptop',
  category: 'IT Equipment',
  brand: 'ProcureTech',
  estimatedUnitPrice: 100,
  defaultPackagingUnit: packagingUnit,
  defaultPackagingUnitId: 'unit-1',
  isActive: true,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const supplier = {
  id: 'supplier-1',
  code: 'SUP-001',
  name: 'Acme Supplies',
  contactName: 'Sam Supplier',
  email: 'supplier@example.test',
  phone: '0800-000',
  city: 'Jakarta',
  country: 'ID',
  paymentTerms: 'NET30',
  isActive: true,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const warehouse = {
  id: 'warehouse-1',
  code: 'WH-001',
  name: 'Main Warehouse',
  address: 'Jakarta',
  isActive: true,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const budget = {
  id: 'budget-1',
  code: 'BGT-IT-2026',
  name: 'IT Budget 2026',
  fiscalYear: 2026,
  period: 'FY',
  currency: 'IDR',
  status: 'ACTIVE',
  description: 'IT annual budget',
  allocatedAmount: 1000,
  reservedAmount: 100,
  committedAmount: 0,
  consumedAmount: 100,
  availableAmount: 800,
  departmentId: 'dept-1',
  department: { id: 'dept-1', code: 'IT', name: 'Information Technology' },
  createdBy: authUser,
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const purchaseRequest = {
  id: 'pr-1',
  requestNumber: 'PR-2026-0001',
  title: 'Laptop request',
  description: 'Need laptops',
  status: 'APPROVED',
  priority: 'NORMAL',
  requiredDate: '2026-06-01',
  submittedAt: '2026-05-13T00:00:00.000Z',
  totalAmount: 100,
  currency: 'IDR',
  requesterId: 'requester-1',
  requester: { id: 'requester-1', email: 'requester@example.test', fullName: 'Rina Requester' },
  departmentId: 'dept-1',
  department: { id: 'dept-1', code: 'IT', name: 'Information Technology' },
  budgetId: 'budget-1',
  budget,
  items: [
    {
      id: 'pr-line-1',
      itemId: 'item-1',
      packagingUnitId: 'unit-1',
      itemSkuSnapshot: 'LAPTOP-STD-001',
      itemNameSnapshot: 'Standard Business Laptop',
      unitCodeSnapshot: 'PCS',
      unitNameSnapshot: 'Piece',
      quantity: 1,
      estimatedUnitPrice: 100,
      lineTotal: 100,
    },
  ],
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
};

const approvalQueueItem = {
  id: 'approval-1',
  status: 'SUBMITTED',
  canAct: true,
  rejectReason: null,
  purchaseRequest: { ...purchaseRequest, status: 'SUBMITTED' },
  timeline: [
    { label: 'Submitted', actor: 'Rina Requester', status: 'COMPLETED', date: '2026-05-13T00:00:00.000Z', note: null },
    { label: 'Manager Review', actor: 'Maya Manager', status: 'PENDING', date: null, note: null },
  ],
};

const purchaseOrder = {
  id: 'po-1',
  poNumber: 'PO-2026-0001',
  status: 'ISSUED',
  issueDate: '2026-05-13',
  expectedDeliveryDate: '2026-06-01',
  totalAmount: 100,
  currency: 'IDR',
  erpSyncStatus: 'FAILED',
  syncedAt: null,
  notes: null,
  purchaseRequestId: 'pr-1',
  purchaseRequest,
  supplierId: 'supplier-1',
  supplier,
  warehouseId: 'warehouse-1',
  warehouse,
  createdAt: '2026-05-13T00:00:00.000Z',
  updatedAt: '2026-05-13T00:00:00.000Z',
  items: [
    {
      id: 'po-item-1',
      itemSkuSnapshot: 'LAPTOP-STD-001',
      itemNameSnapshot: 'Standard Business Laptop',
      unitCodeSnapshot: 'PCS',
      quantityOrdered: 5,
      quantityReceived: 1,
      unitPrice: 100,
      lineTotal: 500,
    },
  ],
};

const receivingRecord = {
  id: 'receiving-1',
  receivingNumber: 'RCV-2026-0001',
  status: 'PARTIAL',
  receivedAt: '2026-05-13T00:00:00.000Z',
  deliveryNoteNo: 'DN-001',
  remarks: null,
  purchaseOrderId: 'po-1',
  purchaseOrder,
  warehouseId: 'warehouse-1',
  warehouse,
  receivedById: 'warehouse-user-1',
  receivedBy: { id: 'warehouse-user-1', email: 'wh@example.test', fullName: 'Wira Warehouse' },
  items: [
    {
      id: 'receiving-line-1',
      purchaseOrderItem: purchaseOrder.items[0],
      quantityReceived: 1,
      quantityAccepted: 1,
      quantityRejected: 0,
      scannedCode: 'LAPTOP-STD-001',
      remarks: null,
    },
  ],
};

const erpSyncLog = {
  id: 'sync-log-1',
  operation: 'CREATE_PO',
  status: 'FAILED',
  attemptNo: 1,
  maxAttempts: 3,
  externalId: null,
  requestPayload: { poNumber: 'PO-2026-0001' },
  responsePayload: null,
  errorMessage: 'Mock ERP temporary failure.',
  syncedAt: null,
  nextRetryAt: null,
  purchaseOrderId: 'po-1',
  purchaseOrder,
  triggeredById: 'purchasing-1',
  triggeredBy: { id: 'purchasing-1', email: 'buyer@example.test', fullName: 'Bayu Buyer' },
  previousSyncLogId: null,
  createdAt: '2026-05-13T00:00:00.000Z',
};

const auditTrail = {
  id: 'audit-1',
  action: 'UPDATE',
  entityType: 'BUDGET',
  entityId: 'budget-1',
  entityLabel: 'Budget Management',
  actorId: 'admin-1',
  actor: authUser,
  before: { name: 'Old Budget' },
  after: { name: 'New Budget' },
  metadata: { source: 'test' },
  ipAddress: '127.0.0.1',
  userAgent: 'vitest',
  createdAt: '2026-05-13T00:00:00.000Z',
};
