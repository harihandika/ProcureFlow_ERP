import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppRole } from '../src/common/constants/roles';
import { createTestApp } from './helpers/create-test-app';
import { InMemoryPrisma } from './helpers/in-memory-prisma';

type MasterDataCase = {
  name: string;
  path: string;
  createPayload: Record<string, unknown>;
  updatePayload: Record<string, unknown>;
  expectedCreate: Record<string, unknown>;
  expectedUpdate: Record<string, unknown>;
  readRole: 'admin' | 'requester' | 'purchasing';
};

const cases: MasterDataCase[] = [
  {
    name: 'Departments',
    path: '/api/departments',
    createPayload: { code: 'qa', name: 'Quality Assurance', description: 'Quality checks' },
    updatePayload: { name: 'Updated Quality Control' },
    expectedCreate: { code: 'QA', name: 'Quality Assurance' },
    expectedUpdate: { name: 'Updated Quality Control' },
    readRole: 'requester',
  },
  {
    name: 'Items',
    path: '/api/items',
    createPayload: { sku: 'test-item-001', name: 'Test Item', category: 'Testing', estimatedUnitPrice: 1000 },
    updatePayload: { name: 'Updated Test Item' },
    expectedCreate: { sku: 'TEST-ITEM-001', name: 'Test Item' },
    expectedUpdate: { name: 'Updated Test Item' },
    readRole: 'requester',
  },
  {
    name: 'Suppliers',
    path: '/api/suppliers',
    createPayload: { code: 'sup-test', name: 'Supplier Test', email: 'supplier@test.local', city: 'Jakarta' },
    updatePayload: { name: 'Updated Supplier Test' },
    expectedCreate: { code: 'SUP-TEST', name: 'Supplier Test', email: 'supplier@test.local' },
    expectedUpdate: { name: 'Updated Supplier Test' },
    readRole: 'purchasing',
  },
  {
    name: 'Warehouses',
    path: '/api/warehouses',
    createPayload: { code: 'wh-test', name: 'Warehouse Test', address: 'Block A' },
    updatePayload: { name: 'Updated Warehouse Test' },
    expectedCreate: { code: 'WH-TEST', name: 'Warehouse Test' },
    expectedUpdate: { name: 'Updated Warehouse Test' },
    readRole: 'admin',
  },
  {
    name: 'Packaging Units',
    path: '/api/packaging-units',
    createPayload: { code: 'bag', name: 'Bag', description: 'Bag unit' },
    updatePayload: { name: 'Updated Bag' },
    expectedCreate: { code: 'BAG', name: 'Bag' },
    expectedUpdate: { name: 'Updated Bag' },
    readRole: 'admin',
  },
];

describe('Master data modules (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let requesterToken: string;
  let purchasingToken: string;

  beforeAll(async () => {
    const prisma = new InMemoryPrisma();
    await prisma.seedAuthUsers();

    const testApp = await createTestApp({ prismaService: prisma });
    app = testApp.app;

    adminToken = await login('admin@procureflow.test');
    requesterToken = await login('requester@procureflow.test');
    purchasingToken = await login('purchasing@procureflow.test');
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'Password123!' })
      .expect(200);

    return response.body.accessToken as string;
  }

  function tokenFor(role: MasterDataCase['readRole']) {
    return {
      admin: adminToken,
      requester: requesterToken,
      purchasing: purchasingToken,
    }[role];
  }

  for (const moduleCase of cases) {
    describe(moduleCase.name, () => {
      let createdId: string;

      it('allows admin to create data', async () => {
        const response = await request(app.getHttpServer())
          .post(moduleCase.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(moduleCase.createPayload)
          .expect(201);

        createdId = response.body.id;
        expect(response.body).toMatchObject(moduleCase.expectedCreate);
      });

      it('allows admin to update data', async () => {
        const response = await request(app.getHttpServer())
          .patch(`${moduleCase.path}/${createdId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send(moduleCase.updatePayload)
          .expect(200);

        expect(response.body).toMatchObject(moduleCase.expectedUpdate);
      });

      it('allows an authenticated user to read list when their role is allowed', async () => {
        const response = await request(app.getHttpServer())
          .get(moduleCase.path)
          .set('Authorization', `Bearer ${tokenFor(moduleCase.readRole)}`)
          .expect(200);

        expect(response.body.data).toEqual(expect.any(Array));
      });

      it('supports search and pagination when listing data', async () => {
        const response = await request(app.getHttpServer())
          .get(moduleCase.path)
          .query({ search: 'Updated', page: 1, limit: 1 })
          .set('Authorization', `Bearer ${tokenFor(moduleCase.readRole)}`)
          .expect(200);

        expect(response.body.data).toHaveLength(1);
        expect(response.body.meta).toMatchObject({ page: 1, limit: 1 });
        expect(response.body.meta.total).toBeGreaterThanOrEqual(1);
      });

      it('blocks unauthorized users from create, update, and delete', async () => {
        await request(app.getHttpServer())
          .post(moduleCase.path)
          .set('Authorization', `Bearer ${requesterToken}`)
          .send(moduleCase.createPayload)
          .expect(403);

        await request(app.getHttpServer())
          .patch(`${moduleCase.path}/${createdId}`)
          .set('Authorization', `Bearer ${requesterToken}`)
          .send(moduleCase.updatePayload)
          .expect(403);

        await request(app.getHttpServer())
          .delete(`${moduleCase.path}/${createdId}`)
          .set('Authorization', `Bearer ${requesterToken}`)
          .expect(403);
      });

      it('returns validation error for invalid payload', async () => {
        await request(app.getHttpServer())
          .post(moduleCase.path)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({})
          .expect(400);
      });

      it('allows admin to delete or deactivate data', async () => {
        const response = await request(app.getHttpServer())
          .delete(`${moduleCase.path}/${createdId}`)
          .set('Authorization', `Bearer ${adminToken}`)
          .expect(200);

        expect(response.body.deletedAt).toBeTruthy();
        expect(response.body.isActive).toBe(false);
      });
    });
  }
});
