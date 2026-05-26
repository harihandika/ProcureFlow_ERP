import { INestApplication } from '@nestjs/common';
import { AuditAction, BudgetTransactionType, PurchaseRequestStatus } from '@prisma/client';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';
import { money, WorkflowPrisma } from './helpers/workflow-prisma';

describe('Budget and Purchase Request workflows (e2e)', () => {
  let app: INestApplication;
  let prisma: WorkflowPrisma;
  let seed: Awaited<ReturnType<WorkflowPrisma['seedWorkflowData']>>;
  let financeToken: string;
  let requesterToken: string;
  let managerToken: string;
  let budgetId: string;

  beforeAll(async () => {
    prisma = new WorkflowPrisma();
    seed = await prisma.seedWorkflowData();

    const testApp = await createTestApp({ prismaService: prisma });
    app = testApp.app;

    financeToken = await login('finance@procureflow.test');
    requesterToken = await login('requester@procureflow.test');
    managerToken = await login('manager@procureflow.test');
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

  function prPayload(totalUnitPrice: number, budget?: string) {
    return {
      title: `Purchase request ${totalUnitPrice}`,
      departmentId: seed.department.id,
      budgetId: budget,
      items: [
        {
          itemId: seed.item.id,
          packagingUnitId: seed.unit.id,
          quantity: 2,
          estimatedUnitPrice: totalUnitPrice,
        },
        {
          itemId: seed.secondItem.id,
          packagingUnitId: seed.unit.id,
          quantity: 1,
          estimatedUnitPrice: 50,
        },
      ],
    };
  }

  it('allows Finance to create a budget', async () => {
    const budget = await createBudget('BGT-WF-001', 1000);
    budgetId = budget.id;

    expect(budget.code).toBe('BGT-WF-001');
    expect(money(budget.allocatedAmount)).toBe(1000);
    expect(money(budget.reservedAmount)).toBe(0);
    expect(money(budget.availableAmount)).toBe(1000);
  });

  it('blocks users without permission from creating a budget', async () => {
    await request(app.getHttpServer())
      .post('/api/budgets')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        code: 'BGT-BLOCKED',
        name: 'Blocked Budget',
        fiscalYear: 2026,
        period: 'BLOCKED',
        allocatedAmount: 500,
        departmentId: seed.department.id,
      })
      .expect(403);
  });

  it('allows Requester to create a draft PR with multiple items and correct total', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send(prPayload(100, budgetId))
      .expect(201);

    expect(response.body.status).toBe(PurchaseRequestStatus.DRAFT);
    expect(response.body.items).toHaveLength(2);
    expect(money(response.body.totalAmount)).toBe(250);
  });

  it('does not submit a PR when the budget is insufficient', async () => {
    const smallBudget = await createBudget('BGT-WF-SMALL', 100);
    const created = await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send(prPayload(100, smallBudget.id))
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/purchase-requests/${created.body.id}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({})
      .expect(400);
  });

  it('returns validation errors for invalid item or budget references', async () => {
    await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        ...prPayload(100, '10000000-0000-4000-8000-000000009999'),
      })
      .expect(400);

    await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({
        ...prPayload(100, budgetId),
        items: [
          {
            itemId: '10000000-0000-4000-8000-000000009999',
            packagingUnitId: seed.unit.id,
            quantity: 1,
            estimatedUnitPrice: 100,
          },
        ],
      })
      .expect(400);
  });

  it('submits a PR when budget is sufficient, reserves budget, exposes approval queue, and writes audit', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/purchase-requests')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send(prPayload(100, budgetId))
      .expect(201);

    const submitted = await request(app.getHttpServer())
      .post(`/api/purchase-requests/${created.body.id}/submit`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({})
      .expect(201);

    expect(submitted.body.status).toBe(PurchaseRequestStatus.SUBMITTED);

    const budget = await request(app.getHttpServer())
      .get(`/api/budgets/${budgetId}`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);

    expect(money(budget.body.reservedAmount)).toBe(250);
    expect(money(budget.body.availableAmount)).toBe(750);

    const transactions = await request(app.getHttpServer())
      .get(`/api/budgets/${budgetId}/transactions`)
      .set('Authorization', `Bearer ${financeToken}`)
      .expect(200);

    expect(transactions.body.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ type: BudgetTransactionType.RESERVATION })]),
    );

    const queue = await request(app.getHttpServer())
      .get('/api/approvals/my-queue')
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);

    expect(queue.body).toEqual(expect.arrayContaining([expect.objectContaining({ id: submitted.body.id })]));

    const audits = await prisma.auditTrail.findMany({
      where: {
        action: AuditAction.SUBMIT,
        entityId: submitted.body.id,
      },
    });

    expect(audits).toHaveLength(1);
  });
});

