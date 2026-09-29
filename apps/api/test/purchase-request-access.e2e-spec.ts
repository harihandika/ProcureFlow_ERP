import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppRole } from '../src/common/constants/roles';
import { AiProxyService } from '../src/ai/ai-proxy.service';
import { createTestApp } from './helpers/create-test-app';
import { WorkflowPrisma } from './helpers/workflow-prisma';

describe('Purchase request and AI access (e2e)', () => {
  let app: INestApplication;
  let ownerToken: string;
  let otherToken: string;
  let foreignManagerToken: string;
  let financeToken: string;
  let purchasingToken: string;
  let prId: string;
  let ownerId: string;
  const auditPr = jest.fn().mockResolvedValue({ riskScore: 0 });

  beforeAll(async () => {
    const prisma = new WorkflowPrisma();
    const seed = await prisma.seedWorkflowData();
    ownerId = seed.users.requester.id;
    const foreignDept = await prisma.department.create({ data: { code: 'OTHER', name: 'Other Department' } });
    await prisma.user.create({ data: {
      email: 'other-requester@test.test', fullName: 'Other Requester', passwordHash: seed.users.requester.passwordHash,
      departmentId: seed.department.id, roleAssignments: { create: [{ roleId: seed.roles.get(AppRole.Requester)!.id }] },
    } });
    await prisma.user.create({ data: {
      email: 'foreign-manager@test.test', fullName: 'Foreign Manager', passwordHash: seed.users.manager.passwordHash,
      departmentId: foreignDept.id, roleAssignments: { create: [{ roleId: seed.roles.get(AppRole.Manager)!.id }] },
    } });
    const setup = await createTestApp({ prismaService: prisma, configureModule: (builder) => builder.overrideProvider(AiProxyService).useValue({ auditPr }) });
    app = setup.app;
    const login = async (email: string) => {
      const response = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password: seed.password }).expect(200);
      return response.body.accessToken as string;
    };
    ownerToken = await login('requester@procureflow.test');
    otherToken = await login('other-requester@test.test');
    foreignManagerToken = await login('foreign-manager@test.test');
    financeToken = await login('finance@procureflow.test');
    purchasingToken = await login('purchasing@procureflow.test');
    const response = await request(app.getHttpServer()).post('/api/purchase-requests').set('Authorization', `Bearer ${ownerToken}`).send({ title: 'Private request', departmentId: seed.department.id }).expect(201);
    prId = response.body.id;
  });
  afterAll(async () => { if (app) await app.close(); });

  it('allows the owner to read their own PR', async () => {
    await request(app.getHttpServer()).get(`/api/purchase-requests/${prId}`).set('Authorization', `Bearer ${ownerToken}`).expect(200);
  });
  it('prevents another requester from reading details or widening list filters', async () => {
    await request(app.getHttpServer()).get(`/api/purchase-requests/${prId}`).set('Authorization', `Bearer ${otherToken}`).expect(404);
    const response = await request(app.getHttpServer()).get(`/api/purchase-requests?requesterId=${ownerId}`).set('Authorization', `Bearer ${otherToken}`).expect(200);
    expect(response.body.data).toEqual([]);
  });
  it('prevents a foreign manager from reading or auditing the PR', async () => {
    await request(app.getHttpServer()).get(`/api/purchase-requests/${prId}`).set('Authorization', `Bearer ${foreignManagerToken}`).expect(404);
    await request(app.getHttpServer()).post(`/api/ai/audit-pr/${prId}`).set('Authorization', `Bearer ${foreignManagerToken}`).expect(404);
    expect(auditPr).not.toHaveBeenCalled();
  });
  it('preserves broader Finance/Purchasing read access', async () => {
    for (const token of [financeToken, purchasingToken]) {
      await request(app.getHttpServer()).get(`/api/purchase-requests/${prId}`).set('Authorization', `Bearer ${token}`).expect(200);
    }
  });
  it('allows authorized AI audits and rejects invalid UUIDs before calling AI', async () => {
    await request(app.getHttpServer()).post('/api/ai/audit-pr/not-a-uuid').set('Authorization', `Bearer ${financeToken}`).expect(400);
    expect(auditPr).not.toHaveBeenCalled();
    await request(app.getHttpServer()).post(`/api/ai/audit-pr/${prId}`).set('Authorization', `Bearer ${financeToken}`).expect(201);
    expect(auditPr).toHaveBeenCalledWith(prId);
  });
});
