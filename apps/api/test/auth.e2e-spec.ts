import { INestApplication } from '@nestjs/common';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { createTestApp } from './helpers/create-test-app';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditTrail: {
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  };

  beforeAll(async () => {
    process.env.JWT_SECRET = 'test-secret';
    const passwordHash = await bcrypt.hash('Password123!', 12);

    prismaMock.user.findFirst.mockResolvedValue({
      id: '1c1d7d76-5b5d-4ce0-8b13-4aa8bbdc6992',
      email: 'admin@procureflow.test',
      passwordHash,
      fullName: 'Alya Admin',
      status: UserStatus.ACTIVE,
      departmentId: null,
      roleAssignments: [{ role: { name: 'ADMIN' } }],
    });
    prismaMock.user.update.mockResolvedValue({});
    prismaMock.auditTrail.create.mockResolvedValue({});

    const testApp = await createTestApp({ prismaService: prismaMock });
    app = testApp.app;
  });

  afterAll(async () => {
    await app.close();
  });

  it('/api/auth/login (POST)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@procureflow.test', password: 'Password123!' })
      .expect(200);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.user.roles).toEqual(['ADMIN']);
  });
});
