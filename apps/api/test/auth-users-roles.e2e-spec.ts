import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppRole } from '../src/common/constants/roles';
import { createTestApp } from './helpers/create-test-app';
import { InMemoryPrisma } from './helpers/in-memory-prisma';

describe('Auth, Users, and Roles (e2e)', () => {
  let app: INestApplication;
  let prisma: InMemoryPrisma;
  let adminToken: string;
  let requesterToken: string;
  let requesterRoleId: string;

  beforeAll(async () => {
    prisma = new InMemoryPrisma();
    const seeded = await prisma.seedAuthUsers();
    requesterRoleId = seeded.roles.get(AppRole.Requester)!.id;

    const testApp = await createTestApp({ prismaService: prisma });
    app = testApp.app;

    adminToken = await login('admin@procureflow.test', 'Password123!');
    requesterToken = await login('requester@procureflow.test', 'Password123!');
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string, password: string) {
    const response = await request(app.getHttpServer()).post('/api/auth/login').send({ email, password }).expect(200);

    return response.body.accessToken as string;
  }

  it('registers a user successfully through the Users module', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'new.requester@procureflow.test',
        username: 'new.requester',
        password: 'Password123!',
        fullName: 'New Requester',
        roleIds: [requesterRoleId],
      })
      .expect(201);

    expect(response.body.email).toBe('new.requester@procureflow.test');
    expect(response.body.passwordHash).toBeUndefined();
    expect(response.body.roles).toEqual(expect.arrayContaining([expect.objectContaining({ name: AppRole.Requester })]));
  });

  it('logs in successfully', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@procureflow.test', password: 'Password123!' })
      .expect(200);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.user.roles).toContain(AppRole.Admin);
  });

  it('rejects login with a wrong password', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@procureflow.test', password: 'WrongPassword123!' })
      .expect(401);
  });

  it('rejects login with an unknown email', async () => {
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'missing@procureflow.test', password: 'Password123!' })
      .expect(401);
  });

  it('rejects a protected route without token', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').expect(401);
  });

  it('accepts a protected route with a valid JWT', async () => {
    await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`).expect(200);
  });

  it('blocks unauthorized roles with the role guard', async () => {
    await request(app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ name: 'TEST_BLOCKED_ROLE' })
      .expect(403);
  });

  it('allows authorized roles with the role guard', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/roles')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'TEST_ALLOWED_ROLE', description: 'Allowed by admin' })
      .expect(201);

    expect(response.body.name).toBe('TEST_ALLOWED_ROLE');
  });

  it('returns the current user from GET /auth/me', async () => {
    const response = await request(app.getHttpServer()).get('/api/auth/me').set('Authorization', `Bearer ${adminToken}`).expect(200);

    expect(response.body).toMatchObject({
      email: 'admin@procureflow.test',
      fullName: 'Alya Admin',
      roles: [AppRole.Admin],
    });
  });
});
