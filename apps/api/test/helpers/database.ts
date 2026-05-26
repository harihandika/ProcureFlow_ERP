import { PrismaService } from '../../src/prisma/prisma.service';

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

export function assertTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? '';
  const isTestEnvironment = process.env.NODE_ENV === 'test';
  const looksLikeTestDatabase = /test/i.test(databaseUrl);

  if (!isTestEnvironment || !looksLikeTestDatabase) {
    throw new Error(
      'Refusing to clean database because NODE_ENV is not "test" or DATABASE_URL does not look like a test database.',
    );
  }
}

export async function cleanDatabase(prisma: PrismaService) {
  assertTestDatabase();

  const quotedTables = tables.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);
}
