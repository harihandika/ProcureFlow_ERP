import { randomUUID } from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditTrailsService } from '../src/audit-trails/audit-trails.service';
import { PurchaseRequestsService } from '../src/purchase-requests/purchase-requests.service';
import { ApprovalsService } from '../src/approvals/approvals.service';
import { PurchaseOrdersService } from '../src/purchase-orders/purchase-orders.service';
import { ReceivingService } from '../src/receiving/receiving.service';
import { InvoicesService } from '../src/invoices/invoices.service';
import { ErpIntegrationService } from '../src/erp-integration/erp-integration.service';
import { AuthenticatedUser } from '../src/common/interfaces/authenticated-user.interface';

// This suite never truncates tables or runs migrations. Use an isolated, migrated local test database.
describe('PostgreSQL transaction integrity', () => {
  let db: PrismaClient;
  let user: AuthenticatedUser;
  let departmentId: string;
  let itemId: string;
  let unitId: string;
  let supplierId: string;
  let warehouseId: string;
  const code = () => randomUUID().slice(0, 12);
  const services = (client: PrismaService) => {
    const audit = new AuditTrailsService(client);
    return {
      audit, pr: new PurchaseRequestsService(client, audit), approvals: new ApprovalsService(client, audit),
      po: new PurchaseOrdersService(client, audit), receiving: new ReceivingService(client, audit),
      invoices: new InvoicesService(client, audit),
      erp: new ErpIntegrationService(client, audit),
    };
  };
  const currentServices = () => services(db as PrismaService);

  beforeAll(async () => {
    const url = process.env.TEST_DATABASE_URL;
    if (!url) throw new Error('TEST_DATABASE_URL is required; refusing to use the application database.');
    const parsed = new URL(url);
    if (!['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) || !/^\/procureflow_test_/.test(parsed.pathname)) {
      throw new Error('Refusing to test outside a dedicated local procureflow_test_ database.');
    }
    db = new PrismaClient({ datasources: { db: { url } } });
    const department = await db.department.create({ data: { code: code(), name: 'Test Department' } });
    departmentId = department.id;
    const actor = await db.user.create({ data: { email: `${code()}@concurrency.test`, fullName: 'Test Actor', passwordHash: 'unused', departmentId } });
    user = { id: actor.id, email: actor.email, fullName: actor.fullName, departmentId, roles: ['ADMIN', 'FINANCE', 'REQUESTER', 'WAREHOUSE'] };
    unitId = (await db.packagingUnit.create({ data: { code: code(), name: 'Test Unit' } })).id;
    itemId = (await db.item.create({ data: { sku: code(), name: 'Test Item', defaultPackagingUnitId: unitId } })).id;
    supplierId = (await db.supplier.create({ data: { code: code(), name: 'Test Supplier' } })).id;
    warehouseId = (await db.warehouse.create({ data: { code: code(), name: 'Test Warehouse' } })).id;
  });
  afterAll(async () => { if (db) await db.$disconnect(); });

  async function budget(amount = 100) {
    return db.budget.create({ data: { code: code(), name: 'Test Budget', departmentId, fiscalYear: 2026, period: code(), status: 'ACTIVE', allocatedAmount: amount } });
  }
  async function draft(budgetId: string, quantity = 1, unitPrice = 80) {
    return currentServices().pr.createDraft({ title: 'Test Request', departmentId, budgetId, items: [{ itemId, packagingUnitId: unitId, quantity, estimatedUnitPrice: unitPrice }] }, user);
  }
  async function submitted() {
    const b = await budget();
    const pr = await draft(b.id);
    await currentServices().pr.submit(pr.id, {}, user);
    return { b, pr };
  }
  async function order(quantity = 10) {
    const b = await budget(1000);
    const pr = await draft(b.id, quantity, 1);
    const s = currentServices();
    await s.pr.submit(pr.id, {}, user);
    await s.approvals.approve(pr.id, user);
    const po = await s.po.generateFromPurchaseRequest(pr.id, { supplierId }, user);
    return db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'ISSUED', warehouseId }, include: { items: true } });
  }
  async function receivedOrder() {
    const po = await order();
    await currentServices().receiving.receive({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 10 }] }, user);
    return po;
  }

  async function overlap(
    model: string,
    left: (s: ReturnType<typeof services>) => Promise<unknown>,
    right: (s: ReturnType<typeof services>) => Promise<unknown>,
  ) {
    let reads = 0;
    let release!: () => void;
    const ready = new Promise<void>((resolve) => { release = resolve; });
    const timer = setTimeout(release, 3000);
    const clients = [new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL! } } }), new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL! } } })];
    const wrapped = clients.map((client) => client.$extends({ query: { $allModels: { async $allOperations({ model: queryModel, operation, args, query }) {
      const result = await query(args);
      if (queryModel === model && operation === 'findFirst' && reads < 2) {
        reads += 1;
        if (reads === 2) release();
        await ready;
      }
      return result;
    } } } }));
    try {
      const result = await Promise.allSettled([left(services(wrapped[0] as unknown as PrismaService)), right(services(wrapped[1] as unknown as PrismaService))]);
      expect(reads).toBe(2); // Both initial reads must overlap, including on separate connections.
      return result;
    } finally {
      clearTimeout(timer);
      await Promise.all(clients.map((client) => client.$disconnect()));
    }
  }
  const successCount = (results: PromiseSettledResult<unknown>[]) => results.filter((r) => r.status === 'fulfilled').length;

  it('keeps draft edits and submission reservation consistent when they overlap', async () => {
    const b = await budget(1000);
    const pr = await draft(b.id);
    const results = await overlap('PurchaseRequest',
      (s) => s.pr.updateDraft(pr.id, { items: [{ itemId, packagingUnitId: unitId, quantity: 2, estimatedUnitPrice: 80 }] }, user),
      (s) => s.pr.submit(pr.id, {}, user));
    expect(results.some((result) => result.status === 'fulfilled')).toBe(true);
    const finalPr = await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id }, include: { items: true } });
    const reservation = await db.budgetTransaction.findFirst({ where: { purchaseRequestId: pr.id, type: 'RESERVATION' } });
    if (finalPr.status === 'SUBMITTED') {
      expect(reservation?.amount).toEqual(finalPr.totalAmount);
      expect(finalPr.items.reduce((total, item) => total.plus(item.lineTotal), new Prisma.Decimal(0))).toEqual(finalPr.totalAmount);
    } else {
      expect(reservation).toBeNull();
    }
  });

  it('does not lose either of two concurrent item additions', async () => {
    const b = await budget(1000);
    const pr = await draft(b.id);
    const results = await overlap('PurchaseRequest',
      (s) => s.pr.addItems(pr.id, { items: [{ itemId, packagingUnitId: unitId, quantity: 1, estimatedUnitPrice: 10 }] }, user),
      (s) => s.pr.addItems(pr.id, { items: [{ itemId, packagingUnitId: unitId, quantity: 1, estimatedUnitPrice: 20 }] }, user));
    expect(successCount(results)).toBe(2);
    const finalPr = await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id }, include: { items: true } });
    expect(finalPr.items).toHaveLength(3);
    expect(finalPr.totalAmount).toEqual(new Prisma.Decimal(110));
  });

  it('allows only one of concurrent cancellation and receiving', async () => {
    const po = await order();
    const results = await overlap('PurchaseOrder',
      (s) => s.po.updateStatus(po.id, { status: 'CANCELLED' }, user),
      (s) => s.receiving.receive({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 1 }] }, user));
    expect(successCount(results)).toBe(1);
    const finalPo = await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } });
    const receiptCount = await db.receiving.count({ where: { purchaseOrderId: po.id } });
    expect(finalPo.status === 'CANCELLED' ? receiptCount === 0 : finalPo.status === 'PARTIALLY_RECEIVED' && receiptCount === 1).toBe(true);
  });

  it('rolls back draft edits and added items when audit fails', async () => {
    const b = await budget(1000);
    const pr = await draft(b.id);
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.pr.updateDraft(pr.id, { title: 'Changed' }, user)).rejects.toThrow('audit failed');
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } })).title).toBe('Test Request');
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.pr.addItems(pr.id, { items: [{ itemId, packagingUnitId: unitId, quantity: 1, estimatedUnitPrice: 10 }] }, user)).rejects.toThrow('audit failed');
    const saved = await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id }, include: { items: true } });
    expect(saved.totalAmount).toEqual(new Prisma.Decimal(80));
    expect(saved.items).toHaveLength(1);
  });

  it('rolls back a purchase order status change when audit fails', async () => {
    const po = await order();
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.po.updateStatus(po.id, { status: 'CANCELLED' }, user)).rejects.toThrow('audit failed');
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('ISSUED');
  });

  it('does not let ERP sync move a received order back to issued', async () => {
    const po = await receivedOrder();
    await expect(currentServices().erp.syncPurchaseOrder(po.id, { simulateStatus: 'SUCCESS' }, user)).rejects.toThrow('Only draft or issued purchase orders');
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('RECEIVED');
    expect(await db.erpSyncLog.count({ where: { purchaseOrderId: po.id } })).toBe(0);
  });

  it('reserves only one of two requests exceeding the shared budget', async () => {
    const b = await budget();
    const first = await draft(b.id);
    const second = await draft(b.id);
    const results = await overlap('Budget', (s) => s.pr.submit(first.id, {}, user), (s) => s.pr.submit(second.id, {}, user));
    expect(successCount(results)).toBe(1);
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('80');
    expect(await db.budgetTransaction.count({ where: { budgetId: b.id, type: 'RESERVATION' } })).toBe(1);
    expect(await db.auditTrail.count({ where: { entityId: { in: [first.id, second.id] }, action: 'SUBMIT' } })).toBe(1);
  });

  it('does not reserve twice when the same PR is submitted concurrently', async () => {
    const b = await budget(200);
    const pr = await draft(b.id);
    const results = await overlap('PurchaseRequest', (s) => s.pr.submit(pr.id, {}, user), (s) => s.pr.submit(pr.id, {}, user));
    expect(successCount(results)).toBe(1);
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('80');
    expect(await db.budgetTransaction.count({ where: { purchaseRequestId: pr.id, type: 'RESERVATION' } })).toBe(1);
  });

  it('leaves insufficient-budget requests and ledger unchanged', async () => {
    const b = await budget(10);
    const pr = await draft(b.id);
    await expect(currentServices().pr.submit(pr.id, {}, user)).rejects.toThrow('exceeds available budget');
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } })).status).toBe('DRAFT');
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('0');
    expect(await db.budgetTransaction.count({ where: { purchaseRequestId: pr.id } })).toBe(0);
    expect(await db.auditTrail.count({ where: { entityId: pr.id, action: 'SUBMIT' } })).toBe(0);
  });

  it('releases a rejected reservation exactly once', async () => {
    const { b, pr } = await submitted();
    await currentServices().approvals.reject(pr.id, { reason: 'Not needed' }, user);
    await expect(currentServices().approvals.reject(pr.id, { reason: 'Again' }, user)).rejects.toThrow('Only submitted');
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('0');
    expect(await db.budgetTransaction.count({ where: { purchaseRequestId: pr.id, type: 'RELEASE' } })).toBe(1);
  });

  it('commits only one of concurrent approval and rejection', async () => {
    const { b, pr } = await submitted();
    const results = await overlap('PurchaseRequest', (s) => s.approvals.approve(pr.id, user), (s) => s.approvals.reject(pr.id, { reason: 'No' }, user));
    expect(successCount(results)).toBe(1);
    const saved = await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } });
    expect(await db.approval.count({ where: { purchaseRequestId: pr.id } })).toBe(1);
    expect(await db.auditTrail.count({ where: { entityId: pr.id, action: 'UPDATE' } })).toBe(1);
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe(saved.status === 'REJECTED' ? '0' : '80');
  });

  it('rolls back rejection including ledger and decision if audit fails', async () => {
    const { b, pr } = await submitted();
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.approvals.reject(pr.id, { reason: 'No' }, user)).rejects.toThrow('audit failed');
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } })).status).toBe('SUBMITTED');
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('80');
    expect(await db.approval.count({ where: { purchaseRequestId: pr.id } })).toBe(0);
    expect(await db.budgetTransaction.count({ where: { purchaseRequestId: pr.id, type: 'RELEASE' } })).toBe(0);
  });

  it('rolls back submit if audit fails', async () => {
    const b = await budget();
    const pr = await draft(b.id);
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.pr.submit(pr.id, {}, user)).rejects.toThrow('audit failed');
    expect((await db.purchaseRequest.findUniqueOrThrow({ where: { id: pr.id } })).status).toBe('DRAFT');
    expect((await db.budget.findUniqueOrThrow({ where: { id: b.id } })).reservedAmount.toString()).toBe('0');
    expect(await db.budgetTransaction.count({ where: { purchaseRequestId: pr.id } })).toBe(0);
  });

  it('allows only one concurrent receipt of 6 against an order of 10', async () => {
    const po = await order();
    const dto = { purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 6 }] };
    const results = await overlap('PurchaseOrder', (s) => s.receiving.receive(dto, user), (s) => s.receiving.receive(dto, user));
    expect(successCount(results)).toBe(1);
    expect((await db.purchaseOrderItem.findUniqueOrThrow({ where: { id: po.items[0].id } })).quantityReceived.toString()).toBe('6');
    expect(await db.receiving.count({ where: { purchaseOrderId: po.id } })).toBe(1);
  });

  it('preserves both receipts of 4 and 6 and marks the PO received', async () => {
    const po = await order();
    const dto = (qty: number) => ({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: qty }] });
    const results = await overlap('PurchaseOrder', (s) => s.receiving.receive(dto(4), user), (s) => s.receiving.receive(dto(6), user));
    expect(successCount(results)).toBe(2);
    expect((await db.purchaseOrderItem.findUniqueOrThrow({ where: { id: po.items[0].id } })).quantityReceived.toString()).toBe('10');
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('RECEIVED');
    expect(await db.receiving.count({ where: { purchaseOrderId: po.id } })).toBe(2);
  });

  it('rolls back receiving if audit fails', async () => {
    const po = await order();
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.receiving.receive({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: 6 }] }, user)).rejects.toThrow('audit failed');
    expect(await db.receiving.count({ where: { purchaseOrderId: po.id } })).toBe(0);
    expect((await db.purchaseOrderItem.findUniqueOrThrow({ where: { id: po.items[0].id } })).quantityReceived.toString()).toBe('0');
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('ISSUED');
  });

  it('preserves whole-PO status when different lines are received concurrently', async () => {
    const po = await order();
    const { id: firstId, ...line } = po.items[0];
    const second = await db.purchaseOrderItem.create({ data: { ...line, purchaseRequestItemId: null } });
    const dto = (lineId: string) => ({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: lineId, quantityReceived: 10 }] });
    const results = await overlap('PurchaseOrder', (s) => s.receiving.receive(dto(firstId), user), (s) => s.receiving.receive(dto(second.id), user));
    expect(successCount(results)).toBe(2);
    const items = await db.purchaseOrderItem.findMany({ where: { purchaseOrderId: po.id } });
    expect(items.every((item) => item.quantityReceived.eq(10))).toBe(true);
    expect((await db.purchaseOrder.findUniqueOrThrow({ where: { id: po.id } })).status).toBe('RECEIVED');
  });

  it('generates one PO for concurrent requests and enforces the database index', async () => {
    const { pr } = await submitted();
    await currentServices().approvals.approve(pr.id, user);
    const results = await overlap('PurchaseOrder', (s) => s.po.generateFromPurchaseRequest(pr.id, { supplierId }, user), (s) => s.po.generateFromPurchaseRequest(pr.id, { supplierId }, user));
    expect(successCount(results)).toBe(1);
    const orders = await db.purchaseOrder.findMany({ where: { purchaseRequestId: pr.id } });
    expect(orders).toHaveLength(1);
    expect(await db.auditTrail.count({ where: { entityId: orders[0].id, action: 'CREATE' } })).toBe(1);
    await expect(db.purchaseOrder.create({ data: { poNumber: code(), purchaseRequestId: pr.id, supplierId, warehouseId } })).rejects.toMatchObject({ code: 'P2002' });
    await db.purchaseOrder.update({ where: { id: orders[0].id }, data: { deletedAt: new Date() } });
    await expect(db.purchaseOrder.create({ data: { poNumber: code(), purchaseRequestId: pr.id, supplierId, warehouseId } })).resolves.toBeDefined();
  });

  it('rejects an invoice for partial receipt, then generates one full invoice concurrently', async () => {
    const po = await order();
    const dto = (qty: number) => ({ purchaseOrderId: po.id, items: [{ purchaseOrderItemId: po.items[0].id, quantityReceived: qty }] });
    await currentServices().receiving.receive(dto(6), user);
    await expect(currentServices().invoices.generateFromPo(po.id, user)).rejects.toThrow('fully received');
    expect(await db.invoice.count({ where: { purchaseOrderId: po.id } })).toBe(0);
    await currentServices().receiving.receive(dto(4), user);
    const results = await overlap('Invoice', (s) => s.invoices.generateFromPo(po.id, user), (s) => s.invoices.generateFromPo(po.id, user));
    expect(successCount(results)).toBe(1);
    const invoices = await db.invoice.findMany({ where: { purchaseOrderId: po.id }, include: { items: true } });
    expect(invoices).toHaveLength(1);
    expect(invoices[0].totalAmount.toString()).toBe('10');
    expect(invoices[0].items[0].quantity.toString()).toBe('10');
  });

  it('rolls back PO and copied items when audit fails', async () => {
    const { pr } = await submitted();
    const s = currentServices();
    await s.approvals.approve(pr.id, user);
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.po.generateFromPurchaseRequest(pr.id, { supplierId }, user)).rejects.toThrow('audit failed');
    expect(await db.purchaseOrder.count({ where: { purchaseRequestId: pr.id } })).toBe(0);
    expect(await db.purchaseOrderItem.count({ where: { purchaseRequestItemId: pr.items[0].id } })).toBe(0);
  });

  it('pays an invoice once under concurrent requests', async () => {
    const po = await receivedOrder();
    const invoice = await currentServices().invoices.generateFromPo(po.id, user);
    const results = await overlap('Invoice', (s) => s.invoices.payInvoice(invoice.id, user), (s) => s.invoices.payInvoice(invoice.id, user));
    expect(successCount(results)).toBe(1);
    expect((await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe('PAID');
    expect(await db.auditTrail.count({ where: { entityId: invoice.id, action: 'UPDATE' } })).toBe(1);
  });

  it('rolls back invoice creation if audit fails', async () => {
    const po = await receivedOrder();
    const s = currentServices();
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.invoices.generateFromPo(po.id, user)).rejects.toThrow('audit failed');
    expect(await db.invoice.count({ where: { purchaseOrderId: po.id } })).toBe(0);
  });

  it('rolls back payment if audit fails', async () => {
    const po = await receivedOrder();
    const s = currentServices();
    const invoice = await s.invoices.generateFromPo(po.id, user);
    jest.spyOn(s.audit, 'record').mockRejectedValueOnce(new Error('audit failed'));
    await expect(s.invoices.payInvoice(invoice.id, user)).rejects.toThrow('audit failed');
    const saved = await db.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(saved.status).toBe('UNPAID');
    expect(saved.paidAt).toBeNull();
    expect(await db.auditTrail.count({ where: { entityId: invoice.id, action: 'UPDATE' } })).toBe(0);
  });

  it('enforces requester ownership and manager department against real data', async () => {
    const { pr } = await submitted();
    const s = currentServices();
    const stranger = { ...user, id: randomUUID(), roles: ['REQUESTER'] };
    await expect(s.pr.findOne(pr.id, stranger)).rejects.toThrow('not found');
    const list = await s.pr.findAll({ page: 1, limit: 10, requesterId: user.id }, stranger);
    expect(list.data).toHaveLength(0);
    await expect(s.pr.findOne(pr.id, { ...user, departmentId: randomUUID(), roles: ['MANAGER'] })).rejects.toThrow('not found');
    await expect(s.pr.findOne(pr.id, { ...user, roles: ['MANAGER'] })).resolves.toHaveProperty('id', pr.id);
    await expect(s.pr.findOne(pr.id, { ...user, roles: ['FINANCE'] })).resolves.toHaveProperty('id', pr.id);
  });
});
