import { INestApplication } from '@nestjs/common';
import { AuditAction, AuditEntityType, ErpSyncStatus, PurchaseRequestStatus } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { WorkflowPrisma } from './helpers/workflow-prisma';

describe('ERP Sync and Audit Trail workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: WorkflowPrisma;
  let seed: Awaited<ReturnType<WorkflowPrisma['seedWorkflowData']>>;
  let adminToken: string;
  let financeToken: string;
  let requesterToken: string;
  let managerToken: string;
  let purchasingToken: string;
  let poId: string;
  let successLogId: string;
  let failedLogId: string;

  beforeAll(async () => {
    prisma = new WorkflowPrisma();
    seed = await prisma.seedWorkflowData();

    const testApp = await createTestApp({ prismaService: prisma });
    app = testApp.app;

    adminToken = await login('admin@procureflow.test');
    financeToken = await login('finance@procureflow.test');
    requesterToken = await login('requester@procureflow.test');
    managerToken = await login('manager@procureflow.test');
    purchasingToken = await login('purchasing@procureflow.test');

    poId = await createApprovedPo();
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

  async function createBudget(code: string) {
    const response = await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', `Bearer ${financeToken}`)
      .send({
        code,
        name: `${code} Budget`,
        fiscalYear: 2026,
        period: code,
        allocatedAmount: 1000,
        departmentId: seed.department.id,
      })
      .expect(201);

    return response.body;
  }

  async function createApprovedPo() {
    const budget = await createBudget('BGT-ERP-001');
    const pr = await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        title: 'ERP Sync Purchase Request',
        departmentId: seed.department.id,
        budgetId: budget.id,
        items: [
          {
            itemId: seed.item.id,
            packagingUnitId: seed.unit.id,
            quantity: 1,
            estimatedUnitPrice: 100,
          },
        ],
      })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/purchase-requests/${pr.body.id}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({})
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/approvals/${pr.body.id}/approve`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({})
      .expect(201);

    const po = await request(app.getHttpServer())
      .post(`/api/purchase-orders/generate-from-pr/${pr.body.id}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ supplierId: seed.supplier.id })
      .expect(201);

    return po.body.id as string;
  }

  it('allows Purchasing to sync PO to mock ERP and creates a success log', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/erp-sync/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ simulateStatus: ErpSyncStatus.SUCCESS })
      .expect(201);

    successLogId = response.body.id;
    expect(response.body.status).toBe(ErpSyncStatus.SUCCESS);
    expect(response.body.externalId).toEqual(expect.stringContaining('ERP-'));
    expect(response.body.purchaseOrder.id).toBe(poId);
  });

  it('creates failed log with error message when mock ERP fails', async () => {
    const response = await request(app.getHttpServer())
      .post(`/api/erp-sync/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ simulateStatus: ErpSyncStatus.FAILED })
      .expect(201);

    failedLogId = response.body.id;
    expect(response.body.status).toBe(ErpSyncStatus.FAILED);
    expect(response.body.errorMessage).toBe('Mock ERP temporary failure.');
  });

  it('blocks unauthorized roles from syncing PO', async () => {
    await request(app.getHttpServer())
      .post(`/api/erp-sync/purchase-orders/${poId}`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ simulateStatus: ErpSyncStatus.SUCCESS })
      .expect(403);
  });

  it('allows failed sync to be retried and updates the previous sync log status', async () => {
    const retry = await request(app.getHttpServer())
      .post(`/api/erp-sync/retry/${failedLogId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ simulateStatus: ErpSyncStatus.SUCCESS })
      .expect(201);

    expect(retry.body.status).toBe(ErpSyncStatus.SUCCESS);
    expect(retry.body.previousSyncLogId).toBe(failedLogId);

    const previousLog = await request(app.getHttpServer())
      .get(`/api/erp-sync/logs/${failedLogId}`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .expect(200);

    expect(previousLog.body.status).toBe(ErpSyncStatus.RETRYING);
  });

  it('creates audit trail records for important actions', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/audit-trails')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ entityType: AuditEntityType.PURCHASE_ORDER })
      .expect(200);

    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: AuditAction.CREATE, entityType: AuditEntityType.PURCHASE_ORDER }),
        expect.objectContaining({ action: AuditAction.SYNC_ERP, entityType: AuditEntityType.PURCHASE_ORDER }),
      ]),
    );
  });

  it('filters audit trail list by module, user, and action', async () => {
    const byModule = await request(app.getHttpServer())
      .get('/api/audit-trails')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ entityType: AuditEntityType.ERP_SYNC_LOG })
      .expect(200);

    expect(byModule.body.data.every((audit: { entityType: string }) => audit.entityType === AuditEntityType.ERP_SYNC_LOG)).toBe(true);

    const byUser = await request(app.getHttpServer())
      .get('/api/audit-trails')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ actorId: seed.users.purchasing.id })
      .expect(200);

    expect(byUser.body.data.every((audit: { actorId: string }) => audit.actorId === seed.users.purchasing.id)).toBe(true);

    const byAction = await request(app.getHttpServer())
      .get('/api/audit-trails')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: AuditAction.RETRY_ERP_SYNC })
      .expect(200);

    expect(byAction.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ action: AuditAction.RETRY_ERP_SYNC })]),
    );
  });

  it('shows old value and new value on audit trail detail when available', async () => {
    const update = await request(app.getHttpServer())
      .patch(`/api/purchase-orders/${poId}/status`)
      .set('Authorization', `Bearer ${purchasingToken}`)
      .send({ status: 'DRAFT' })
      .expect(200);

    expect(update.body.status).toBe('DRAFT');

    const audits = await request(app.getHttpServer())
      .get('/api/audit-trails')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ action: AuditAction.UPDATE, entityType: AuditEntityType.PURCHASE_ORDER })
      .expect(200);

    const auditId = audits.body.data[0].id;
    const detail = await request(app.getHttpServer())
      .get(`/api/audit-trails/${auditId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(detail.body.before).toEqual(expect.objectContaining({ status: expect.any(String) }));
    expect(detail.body.after).toEqual(expect.objectContaining({ status: 'DRAFT' }));
  });

  it('keeps ERP sync logs queryable by status', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/erp-sync/logs')
      .set('Authorization', `Bearer ${purchasingToken}`)
      .query({ status: ErpSyncStatus.SUCCESS })
      .expect(200);

    expect(response.body.data).toEqual(expect.arrayContaining([expect.objectContaining({ id: successLogId })]));
  });
});

