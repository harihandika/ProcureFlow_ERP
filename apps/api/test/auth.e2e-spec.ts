import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  const prismaMock = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
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

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
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
