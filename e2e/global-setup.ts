import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { execFileSync } from 'child_process';
import { PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const defaultDatabaseUrl = 'postgresql://postgres:postgres@localhost:5432/procureflow_erp_test?schema=public';
const password = 'Password123!';

const roles = ['ADMIN', 'FINANCE', 'MANAGER', 'REQUESTER', 'PURCHASING', 'WAREHOUSE'] as const;

const users: Array<{ email: string; fullName: string; role: (typeof roles)[number] }> = [
  { email: 'admin.e2e@procureflow.test', fullName: 'E2E Admin', role: 'ADMIN' },
  { email: 'finance.e2e@procureflow.test', fullName: 'E2E Finance', role: 'FINANCE' },
  { email: 'manager.e2e@procureflow.test', fullName: 'E2E Manager', role: 'MANAGER' },
  { email: 'requester.e2e@procureflow.test', fullName: 'E2E Requester', role: 'REQUESTER' },
  { email: 'purchasing.e2e@procureflow.test', fullName: 'E2E Purchasing', role: 'PURCHASING' },
  { email: 'warehouse.e2e@procureflow.test', fullName: 'E2E Warehouse', role: 'WAREHOUSE' },
];

const tables = [
  'AuditTrail',
  'ErpSyncLog',
  'ReceivingItem',
  'Receiving',
  'PurchaseOrderItem',
  'PurchaseOrder',
  'BudgetTransaction',
  'PurchaseRequestItem',
  'PurchaseRequest',
  'Budget',
  'Item',
  'Supplier',
  'Warehouse',
  'PackagingUnit',
  'UserRole',
  'Department',
  'Role',
  'User',
];

export default async function globalSetup() {
  loadEnvFile(resolve(process.cwd(), 'apps/api/.env.test'));
  loadEnvFile(resolve(process.cwd(), 'apps/api/.env.test.example'));

  process.env.NODE_ENV = 'test';
  process.env.DATABASE_URL ??= defaultDatabaseUrl;
  process.env.JWT_SECRET ??= 'test-jwt-secret-change-me';
  process.env.JWT_EXPIRES_IN ??= '15m';
  process.env.BCRYPT_SALT_ROUNDS ??= '4';
  process.env.PORT ??= '4001';

  assertTestDatabase(process.env.DATABASE_URL);

  execFileSync(
    'npx',
    ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma', '--skip-generate'],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );

  const prisma = new PrismaClient();

  try {
    await cleanDatabase(prisma);
    await seedRolesAndUsers(prisma);
    await seedSupportingMasterData(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  for (const line of readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split('=');
    process.env[key.trim()] ??= valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
  }
}

function assertTestDatabase(databaseUrl: string) {
  if (process.env.NODE_ENV !== 'test' || !/test/i.test(databaseUrl)) {
    throw new Error('Refusing to run Playwright setup outside a test database.');
  }
}

async function cleanDatabase(prisma: PrismaClient) {
  const quotedTables = tables.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);
}

async function seedRolesAndUsers(prisma: PrismaClient) {
  const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_SALT_ROUNDS ?? 4));

  for (const roleName of roles) {
    const role = await prisma.role.create({
      data: {
        name: roleName,
        description: `E2E ${roleName.toLowerCase()} role.`,
        isSystem: true,
      },
    });
    const user = users.find((candidate) => candidate.role === roleName);

    if (!user) {
      continue;
    }

    const createdUser = await prisma.user.create({
      data: {
        email: user.email,
        username: user.email.split('@')[0],
        fullName: user.fullName,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await prisma.userRole.create({
      data: {
        userId: createdUser.id,
        roleId: role.id,
      },
    });
  }
}

async function seedSupportingMasterData(prisma: PrismaClient) {
  await prisma.packagingUnit.create({
    data: {
      code: 'PCS',
      name: 'Piece',
      description: 'E2E default unit',
      isActive: true,
    },
  });

  await prisma.warehouse.create({
    data: {
      code: 'WH-E2E',
      name: 'E2E Main Warehouse',
      description: 'E2E receiving location',
      address: 'Test warehouse address',
      isActive: true,
    },
  });
}
