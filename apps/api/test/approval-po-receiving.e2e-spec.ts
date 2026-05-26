import { INestApplication } from '@nestjs/common';
import { AuditAction, PurchaseOrderStatus, PurchaseRequestStatus } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { money, WorkflowPrisma } from './helpers/workflow-prisma';

describe('Approval, Purchase Order, and Receiving workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: WorkflowPrisma;
  let seed: Awaited<ReturnType<WorkflowPrisma['seedWorkflowData']>>;
  let financeToken: string;
  let requesterToken: string;
  let managerToken: string;
  let purchasingToken: string;
  let warehouseToken: string;
  let submittedPrId: string;
  let approvedPrId: string;
  let poId: string;
  let poItemId: string;

  beforeAll(async () => {
    prisma = new WorkflowPrisma();
    seed = await prisma.seedWorkflowData();

    const testApp = await createTestApp({ prismaService: prisma });
    app = testApp.app;

    financeToken = await login('finance@procureflow.test');
    requesterToken = await login('requester@procureflow.test');
    managerToken = await login('manager@procureflow.test');
    purchasingToken = await login('purchasing@procureflow.test');
    warehouseToken = await login('warehouse@procureflow.test');

    submittedPrId = await createSubmittedPr('BGT-APPROVAL-001', 1000);
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: seed.password })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function createBudget(code: string, allocatedAmount: number) {
    const response = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        code,
        name: `${code} Budget`,
        fiscalYear: 2026,
        period: code,
        allocatedAmount,
        departmentId: seed.department.id,
      })
      .expect(201);

    return response.body;
  }

  async function createDraftPr(code: string, budgetAmount = 1000) {
    const budget = await createBudget(code, budgetAmount);
    const response = await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        title: `${code} Purchase Request`,
        departmentId: seed.department.id,
        budgetId: budget.id,
        items: [
          {
            itemId: seed.item.id,
            packagingUnitId: seed.unit.id,
            quantity: 4,
            estimatedUnitPrice: 100,
          },
        ],
      })
      .expect(201);

    return response.body.id as string;
  }

  async function createSubmittedPr(code: string, budgetAmount = 1000) {
    const prId = await createDraftPr(code, budgetAmount);
    await request(app.getHttpServer())
      .post(`/api/purchase-requests/${prId}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({})
      .expect(201);

    return prId;
  }

  it('allows Manager to view approval queue', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/approvals/my-queue')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(response.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: submittedPrId, canAct: true })]));
  });

  it('blocks unauthorized roles from approving PRs', async () => {
    await request(app.getHttpServer())
      .post(`/api/approvals/${submittedPrId}/approve`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({})
      .expect(403);
  });

  it('allows Manager to reject PR with reason and creates audit trail', async () => {
    const rejectPrId = await createSubmittedPr('BGT-REJECT-001', 1000);
    const response = await request(app.getHttpServer())
      .post(`/api/approvals/${rejectPrId}/reject`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({ reason: 'Need a cheaper option.' })
      .expect(201);

    expect(response.body.status).toBe(PurchaseRequestStatus.REJECTED);
    expect(response.body.rejectReason).toBe('Need a cheaper option.');

    const audits = await prisma.auditTrail.findMany({
      where: {
        action: AuditAction.UPDATE,
        entityId: rejectPrId,
      },
    });

    expect(audits).toEqual(expect.arrayContaining([expect.objectContaining({ metadata: expect.objectContaining({ approvalDecision: 'REJECTED' }) })]));
  });

  it('allows Manager to approve PR, updates status, and creates audit trail', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/approvals/${submittedPrId}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(201);

    approvedPrId = submittedPrId;
    expect(response.body.status).toBe(PurchaseRequestStatus.APPROVED);
    expect(response.body.purchaseRequest.status).toBe(PurchaseRequestStatus.APPROVED);

    const audits = await prisma.auditTrail.findMany({
      where: {
        action: AuditAction.UPDATE,
        entityId: submittedPrId,
      },
    });

    expect(audits).toEqual(expect.arrayContaining([expect.objectContaining({ metadata: expect.objectContaining({ approvalDecision: 'APPROVED' }) })]));
  });

  it('does not generate PO from an unapproved PR', async () => {
    const draftPrId = await createDraftPr('BGT-DRAFT-PO-001');
    await request(app.getHttpServer())
      .post(`/api/purchase-orders/generate-from-pr/${draftPrId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ supplierId: seed.supplier.id })
      .expect(400);
  });

  it('allows Purchasing to generate PO from approved PR with copied items and assigned supplier', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/purchase-orders/generate-from-pr/${approvedPrId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ supplierId: seed.supplier.id })
      .expect(201);

    poId = response.body.id;
    poItemId = response.body.items[0].id;

    expect(response.body.purchaseRequest.id).toBe(approvedPrId);
    expect(response.body.supplier.id).toBe(seed.supplier.id);
    expect(response.body.items).toHaveLength(1);
    expect(money(response.body.items[0].quantityOrdered)).toBe(4);

    const audits = await prisma.auditTrail.findMany({
      where: {
        action: AuditAction.CREATE,
        entityId: poId,
      },
    });

    expect(audits).toHaveLength(1);
  });

  it('allows Purchasing to update PO status', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/api/purchase-orders/${poId}/status`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ status: PurchaseOrderStatus.ISSUED })
      .expect(200);

    expect(response.body.status).toBe(PurchaseOrderStatus.ISSUED);
  });

  it('allows Warehouse to receive a PO item partially and updates PO status', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/receiving')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        purchaseOrderId: poId,
        items: [
          {
            purchaseOrderItemId: poItemId,
            quantityReceived: 2,
          },
        ],
      })
      .expect(201);

    expect(response.body.status).toBe('PARTIAL');
    expect(response.body.items).toHaveLength(1);

    const po = await request(app.getHttpServer())
      .get(`/api/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .expect(200);

    expect(po.body.status).toBe(PurchaseOrderStatus.PARTIALLY_RECEIVED);
  });

  it('does not allow received quantity to exceed ordered quantity', async () => {
    await request(app.getHttpServer())
      .post('/api/receiving')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        purchaseOrderId: poId,
        items: [
          {
            purchaseOrderItemId: poItemId,
            quantityReceived: 3,
          },
        ],
      })
      .expect(400);
  });

  it('updates PO status to completed when fully received and creates audit trail', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/receiving')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        purchaseOrderId: poId,
        items: [
          {
            itemCode: seed.item.sku,
            quantityReceived: 2,
          },
        ],
      })
      .expect(201);

    expect(response.body.status).toBe('FULL');

    const po = await request(app.getHttpServer())
      .get(`/api/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .expect(200);

    expect(po.body.status).toBe(PurchaseOrderStatus.RECEIVED);

    const audits = await prisma.auditTrail.findMany({
      where: {
        action: AuditAction.RECEIVE,
        entityId: response.body.id,
      },
    });

    expect(audits).toHaveLength(1);
  });
});

