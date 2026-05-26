import { expect, request as playwrightRequest, test, type APIRequestContext, type Page } from '@playwright/test';

const apiBaseUrl = process.env.E2E_API_URL ?? 'http://localhost:4001/api';
const password = 'Password123!';

const accounts = {
  admin: { email: 'admin.e2e@procureflow.test', password },
  finance: { email: 'finance.e2e@procureflow.test', password },
  manager: { email: 'manager.e2e@procureflow.test', password },
  requester: { email: 'requester.e2e@procureflow.test', password },
  purchasing: { email: 'purchasing.e2e@procureflow.test', password },
  warehouse: { email: 'warehouse.e2e@procureflow.test', password },
};

test.describe('ProcureFlow ERP main business flow', () => {
  test('runs procurement from master data setup through ERP sync and audit trail', async ({ page }) => {
    const api = await playwrightRequest.newContext({ baseURL: apiBaseUrl });
    const unique = Date.now().toString().slice(-8);

    try {
      await loginViaUi(page, accounts.admin);
      await expect(page.getByTestId('nav-dashboard')).toBeVisible();

      const adminToken = await loginForToken(api, accounts.admin);
      const department = await apiCall<{ id: string; code: string; name: string }>(api, adminToken, 'post', '/departments', {
        code: `E2E-${unique}`,
        name: `E2E Procurement ${unique}`,
        description: 'Created by Playwright business flow.',
      });
      await expect(page.getByTestId('nav-departments')).toBeVisible();

      const [managerToken, requesterToken] = await Promise.all([
        loginForToken(api, accounts.manager),
        loginForToken(api, accounts.requester),
      ]);
      const manager = await getCurrentUser(api, managerToken);
      const requester = await getCurrentUser(api, requesterToken);

      await apiCall(api, adminToken, 'patch', `/users/${manager.id}`, { departmentId: department.id });
      await apiCall(api, adminToken, 'patch', `/users/${requester.id}`, { departmentId: department.id });

      const packagingUnits = await apiCall<Paginated<{ id: string }>>(api, adminToken, 'get', '/packaging-units?page=1&limit=10');
      const unitId = packagingUnits.data[0].id;
      const firstItem = await apiCall<{ id: string }>(api, adminToken, 'post', '/items', {
        sku: `LAPTOP-E2E-${unique}`,
        name: `E2E Laptop ${unique}`,
        category: 'IT Equipment',
        brand: 'ProcureFlow',
        estimatedUnitPrice: 100,
        defaultPackagingUnitId: unitId,
      });
      const secondItem = await apiCall<{ id: string }>(api, adminToken, 'post', '/items', {
        sku: `MOUSE-E2E-${unique}`,
        name: `E2E Mouse ${unique}`,
        category: 'IT Equipment',
        brand: 'ProcureFlow',
        estimatedUnitPrice: 25,
        defaultPackagingUnitId: unitId,
      });
      const supplier = await apiCall<{ id: string }>(api, adminToken, 'post', '/suppliers', {
        code: `SUP-E2E-${unique}`,
        name: `E2E Supplier ${unique}`,
        contactName: 'E2E Vendor',
        email: `vendor-${unique}@procureflow.test`,
        city: 'Jakarta',
        country: 'Indonesia',
        paymentTerms: 'NET 30',
      });
      await expect(page.getByTestId('nav-items')).toBeVisible();
      await expect(page.getByTestId('nav-suppliers')).toBeVisible();

      await logoutViaUi(page);
      await loginViaUi(page, accounts.finance);
      await expect(page.getByTestId('nav-budgets')).toBeVisible();

      const financeToken = await loginForToken(api, accounts.finance);
      const budget = await apiCall<{ id: string; code: string }>(api, financeToken, 'post', '/budgets', {
        code: `BGT-E2E-${unique}`,
        name: `E2E Budget ${unique}`,
        fiscalYear: 2026,
        period: 'FY',
        currency: 'IDR',
        status: 'ACTIVE',
        allocatedAmount: 5000,
        departmentId: department.id,
      });

      await logoutViaUi(page);
      await loginViaUi(page, accounts.requester);
      await expect(page.getByTestId('nav-purchase-requests')).toBeVisible();

      const purchaseRequest = await apiCall<{ id: string; requestNumber: string }>(api, requesterToken, 'post', '/purchase-requests', {
        title: `E2E Laptop Request ${unique}`,
        description: 'Multiple item purchase request created by Playwright.',
        priority: 'NORMAL',
        requiredDate: '2026-06-30',
        departmentId: department.id,
        budgetId: budget.id,
        items: [
          { itemId: firstItem.id, packagingUnitId: unitId, quantity: 3, estimatedUnitPrice: 100 },
          { itemId: secondItem.id, packagingUnitId: unitId, quantity: 2, estimatedUnitPrice: 25 },
        ],
      });
      await apiCall(api, requesterToken, 'post', `/purchase-requests/${purchaseRequest.id}/submit`, { budgetId: budget.id });
      await page.goto('/purchase-requests');
      await expect(page.getByText(purchaseRequest.requestNumber)).toBeVisible();

      await logoutViaUi(page);
      await loginViaUi(page, accounts.manager);
      await expect(page.getByTestId('nav-approvals')).toBeVisible();

      const managerQueue = await apiCall<Array<{ id: string; purchaseRequest: { id: string } }>>(
        api,
        managerToken,
        'get',
        '/approvals/my-queue',
      );
      const managerApproval = managerQueue.find((approval) => approval.purchaseRequest.id === purchaseRequest.id);
      expect(managerApproval, 'manager approval item').toBeTruthy();
      await apiCall(api, managerToken, 'post', `/approvals/${managerApproval!.id}/approve`);

      await logoutViaUi(page);
      await loginViaUi(page, accounts.finance);
      const financeQueue = await apiCall<Array<{ id: string; status: string; canAct: boolean; purchaseRequest: { id: string } }>>(
        api,
        financeToken,
        'get',
        '/approvals/my-queue',
      );
      const financeApproval = financeQueue.find(
        (approval) => approval.purchaseRequest.id === purchaseRequest.id && approval.status === 'SUBMITTED' && approval.canAct,
      );
      if (financeApproval) {
        await apiCall(api, financeToken, 'post', `/approvals/${financeApproval.id}/approve`);
      }

      await logoutViaUi(page);
      await loginViaUi(page, accounts.purchasing);
      await expect(page.getByTestId('nav-purchase-orders')).toBeVisible();

      const purchasingToken = await loginForToken(api, accounts.purchasing);
      const purchaseOrder = await apiCall<PurchaseOrder>(api, purchasingToken, 'post', `/purchase-orders/generate-from-pr/${purchaseRequest.id}`, {
        supplierId: supplier.id,
      });
      const issuedPurchaseOrder = await apiCall<PurchaseOrder>(api, purchasingToken, 'patch', `/purchase-orders/${purchaseOrder.id}/status`, {
        status: 'ISSUED',
      });
      await page.goto('/purchase-orders');
      await expect(page.getByText(issuedPurchaseOrder.poNumber)).toBeVisible();

      await logoutViaUi(page);
      await loginViaUi(page, accounts.warehouse);
      await expect(page.getByTestId('nav-receiving')).toBeVisible();

      const warehouseToken = await loginForToken(api, accounts.warehouse);
      const firstPoLine = issuedPurchaseOrder.items[0];
      const secondPoLine = issuedPurchaseOrder.items[1];
      await apiCall(api, warehouseToken, 'post', '/receiving', {
        purchaseOrderId: issuedPurchaseOrder.id,
        warehouseId: issuedPurchaseOrder.warehouseId,
        deliveryNoteNo: `DN-PART-${unique}`,
        items: [
          {
            purchaseOrderItemId: firstPoLine.id,
            itemCode: firstPoLine.sku,
            quantityReceived: 1,
            quantityAccepted: 1,
          },
        ],
      });
      await apiCall(api, warehouseToken, 'post', '/receiving', {
        purchaseOrderId: issuedPurchaseOrder.id,
        warehouseId: issuedPurchaseOrder.warehouseId,
        deliveryNoteNo: `DN-FULL-${unique}`,
        items: [
          {
            purchaseOrderItemId: firstPoLine.id,
            itemCode: firstPoLine.sku,
            quantityReceived: firstPoLine.quantityOrdered - 1,
            quantityAccepted: firstPoLine.quantityOrdered - 1,
          },
          {
            purchaseOrderItemId: secondPoLine.id,
            itemCode: secondPoLine.sku,
            quantityReceived: secondPoLine.quantityOrdered,
            quantityAccepted: secondPoLine.quantityOrdered,
          },
        ],
      });
      await page.goto('/receiving');
      await expect(page.getByText(`DN-FULL-${unique}`)).toBeVisible();

      await logoutViaUi(page);
      await loginViaUi(page, accounts.purchasing);
      await apiCall(api, purchasingToken, 'post', `/erp-sync/purchase-orders/${issuedPurchaseOrder.id}`, {
        simulateStatus: 'SUCCESS',
      });
      await page.goto('/erp-sync-logs');
      await expect(page.getByText(issuedPurchaseOrder.poNumber).first()).toBeVisible();

      await logoutViaUi(page);
      await loginViaUi(page, accounts.admin);
      await page.getByTestId('nav-audit-trails').click();
      await expect(page.getByText('Audit Trails')).toBeVisible();
      await expect(page.getByText(purchaseRequest.requestNumber).first()).toBeVisible();
      await expect(page.getByText(issuedPurchaseOrder.poNumber).first()).toBeVisible();
    } finally {
      await api.dispose();
    }
  });
});

async function loginViaUi(page: Page, account: { email: string; password: string }) {
  await page.goto('/login');
  await page.getByTestId('login-email').fill(account.email);
  await page.getByTestId('login-password').fill(account.password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function logoutViaUi(page: Page) {
  await page.getByTestId('logout-button').click();
  await expect(page).toHaveURL(/\/login/);
}

async function loginForToken(api: APIRequestContext, account: { email: string; password: string }) {
  const response = await api.post('/auth/login', { data: account });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { accessToken: string };
  return body.accessToken;
}

async function getCurrentUser(api: APIRequestContext, token: string) {
  return apiCall<{ id: string; email: string; fullName: string }>(api, token, 'get', '/auth/me');
}

async function apiCall<T>(
  api: APIRequestContext,
  token: string,
  method: 'get' | 'post' | 'patch' | 'delete',
  path: string,
  data?: unknown,
) {
  const response = await api[method](path, {
    data,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok()) {
    throw new Error(`${method.toUpperCase()} ${path}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

type Paginated<T> = {
  data: T[];
};

type PurchaseOrder = {
  id: string;
  poNumber: string;
  warehouseId: string;
  items: Array<{
    id: string;
    sku: string;
    quantityOrdered: number;
  }>;
};
