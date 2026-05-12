import { BudgetStatus, BudgetTransactionStatus, BudgetTransactionType, PrismaClient, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const roles = [
  ['ADMIN', 'Full system administration access.'],
  ['FINANCE', 'Budget control and finance approval access.'],
  ['MANAGER', 'Department-level approval access.'],
  ['REQUESTER', 'Purchase request creation access.'],
  ['PURCHASING', 'Purchase order creation and ERP sync access.'],
  ['WAREHOUSE', 'Receiving and warehouse operation access.'],
] as const;

const departments = [
  { code: 'FIN', name: 'Finance', description: 'Budgeting, cost control, and finance approvals.' },
  { code: 'IT', name: 'Information Technology', description: 'Internal technology procurement and services.' },
  { code: 'OPS', name: 'Operations', description: 'Operational purchasing and fulfilment.' },
  { code: 'PUR', name: 'Purchasing', description: 'Supplier coordination and purchase orders.' },
  { code: 'WH', name: 'Warehouse', description: 'Goods receiving and inventory handover.' },
];

const packagingUnits = [
  { code: 'PCS', name: 'Piece', description: 'Single item unit.' },
  { code: 'BOX', name: 'Box', description: 'Box packaging unit.' },
  { code: 'PACK', name: 'Pack', description: 'Grouped package unit.' },
  { code: 'KG', name: 'Kilogram', description: 'Weight-based unit.' },
  { code: 'LTR', name: 'Liter', description: 'Volume-based unit.' },
];

const suppliers = [
  {
    code: 'SUP-001',
    name: 'PT Nusantara Office Supplies',
    contactName: 'Sari Vendor',
    email: 'sales@nusantara-supplies.test',
    phone: '+62215000001',
    city: 'Jakarta',
    country: 'Indonesia',
    paymentTerms: 'NET 30',
  },
  {
    code: 'SUP-002',
    name: 'PT Global Tech Hardware',
    contactName: 'Bima Account',
    email: 'sales@global-tech.test',
    phone: '+62215000002',
    city: 'Bandung',
    country: 'Indonesia',
    paymentTerms: 'NET 14',
  },
];

const warehouses = [
  {
    code: 'WH-MAIN',
    name: 'Main Warehouse',
    description: 'Primary receiving warehouse.',
    address: 'Kawasan Industri Block A',
  },
  {
    code: 'WH-SEC',
    name: 'Secondary Warehouse',
    description: 'Backup warehouse for non-critical goods.',
    address: 'Kawasan Industri Block B',
  },
];

const items = [
  {
    sku: 'LAPTOP-STD-001',
    name: 'Standard Business Laptop',
    description: '14-inch laptop for office productivity.',
    category: 'IT Equipment',
    brand: 'Lenovo',
    estimatedUnitPrice: 12500000,
    unitCode: 'PCS',
    supplierCode: 'SUP-002',
  },
  {
    sku: 'MOUSE-WL-001',
    name: 'Wireless Mouse',
    description: 'Wireless optical mouse.',
    category: 'IT Accessories',
    brand: 'Logitech',
    estimatedUnitPrice: 250000,
    unitCode: 'PCS',
    supplierCode: 'SUP-002',
  },
  {
    sku: 'PAPER-A4-80G',
    name: 'A4 Copy Paper 80gsm',
    description: 'Office copy paper, A4 size.',
    category: 'Office Supplies',
    brand: 'PaperOne',
    estimatedUnitPrice: 65000,
    unitCode: 'BOX',
    supplierCode: 'SUP-001',
  },
];

const users = [
  {
    email: 'admin@procureflow.test',
    fullName: 'Alya Admin',
    jobTitle: 'System Administrator',
    departmentCode: 'IT',
    roleNames: ['ADMIN'],
  },
  {
    email: 'finance@procureflow.test',
    fullName: 'Faris Finance',
    jobTitle: 'Finance Controller',
    departmentCode: 'FIN',
    roleNames: ['FINANCE'],
  },
  {
    email: 'manager@procureflow.test',
    fullName: 'Maya Manager',
    jobTitle: 'IT Manager',
    departmentCode: 'IT',
    roleNames: ['MANAGER'],
  },
  {
    email: 'requester@procureflow.test',
    fullName: 'Rina Requester',
    jobTitle: 'IT Requester',
    departmentCode: 'IT',
    roleNames: ['REQUESTER'],
  },
  {
    email: 'purchasing@procureflow.test',
    fullName: 'Pandu Purchasing',
    jobTitle: 'Purchasing Officer',
    departmentCode: 'PUR',
    roleNames: ['PURCHASING'],
  },
  {
    email: 'warehouse@procureflow.test',
    fullName: 'Wahyu Warehouse',
    jobTitle: 'Warehouse Officer',
    departmentCode: 'WH',
    roleNames: ['WAREHOUSE'],
  },
];

async function main() {
  const passwordHash = await bcrypt.hash('Password123!', 12);

  for (const [name, description] of roles) {
    await prisma.role.upsert({
      where: { name },
      update: { description, isSystem: true, deletedAt: null },
      create: { name, description, isSystem: true },
    });
  }

  for (const department of departments) {
    await prisma.department.upsert({
      where: { code: department.code },
      update: {
        name: department.name,
        description: department.description,
        isActive: true,
        deletedAt: null,
      },
      create: {
        code: department.code,
        name: department.name,
        description: department.description,
      },
    });
  }

  for (const unit of packagingUnits) {
    await prisma.packagingUnit.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        description: unit.description,
        isActive: true,
        deletedAt: null,
      },
      create: unit,
    });
  }

  for (const supplier of suppliers) {
    await prisma.supplier.upsert({
      where: { code: supplier.code },
      update: {
        name: supplier.name,
        contactName: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        city: supplier.city,
        country: supplier.country,
        paymentTerms: supplier.paymentTerms,
        isActive: true,
        deletedAt: null,
      },
      create: supplier,
    });
  }

  for (const warehouse of warehouses) {
    await prisma.warehouse.upsert({
      where: { code: warehouse.code },
      update: {
        name: warehouse.name,
        description: warehouse.description,
        address: warehouse.address,
        isActive: true,
        deletedAt: null,
      },
      create: warehouse,
    });
  }

  const roleMap = new Map((await prisma.role.findMany()).map((role) => [role.name, role.id]));
  const departmentMap = new Map((await prisma.department.findMany()).map((department) => [department.code, department.id]));
  const packagingUnitMap = new Map((await prisma.packagingUnit.findMany()).map((unit) => [unit.code, unit.id]));
  const supplierMap = new Map((await prisma.supplier.findMany()).map((supplier) => [supplier.code, supplier.id]));

  for (const item of items) {
    await prisma.item.upsert({
      where: { sku: item.sku },
      update: {
        name: item.name,
        description: item.description,
        category: item.category,
        brand: item.brand,
        estimatedUnitPrice: item.estimatedUnitPrice,
        defaultPackagingUnitId: packagingUnitMap.get(item.unitCode),
        defaultSupplierId: supplierMap.get(item.supplierCode),
        isActive: true,
        deletedAt: null,
      },
      create: {
        sku: item.sku,
        name: item.name,
        description: item.description,
        category: item.category,
        brand: item.brand,
        estimatedUnitPrice: item.estimatedUnitPrice,
        defaultPackagingUnitId: packagingUnitMap.get(item.unitCode),
        defaultSupplierId: supplierMap.get(item.supplierCode),
      },
    });
  }

  for (const user of users) {
    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        status: UserStatus.ACTIVE,
        passwordHash,
        departmentId: departmentMap.get(user.departmentCode),
        deletedAt: null,
      },
      create: {
        email: user.email,
        username: user.email.split('@')[0],
        fullName: user.fullName,
        jobTitle: user.jobTitle,
        status: UserStatus.ACTIVE,
        passwordHash,
        departmentId: departmentMap.get(user.departmentCode),
      },
    });

    for (const roleName of user.roleNames) {
      const roleId = roleMap.get(roleName);

      if (!roleId) {
        continue;
      }

      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: createdUser.id,
            roleId,
          },
        },
        update: {
          revokedAt: null,
        },
        create: {
          userId: createdUser.id,
          roleId,
        },
      });
    }
  }

  const manager = await prisma.user.findUnique({ where: { email: 'manager@procureflow.test' } });
  const finance = await prisma.user.findUnique({ where: { email: 'finance@procureflow.test' } });
  const purchasing = await prisma.user.findUnique({ where: { email: 'purchasing@procureflow.test' } });
  const warehouse = await prisma.user.findUnique({ where: { email: 'warehouse@procureflow.test' } });

  await prisma.department.update({ where: { code: 'IT' }, data: { managerId: manager?.id } });
  await prisma.department.update({ where: { code: 'FIN' }, data: { managerId: finance?.id } });
  await prisma.department.update({ where: { code: 'PUR' }, data: { managerId: purchasing?.id } });
  await prisma.department.update({ where: { code: 'WH' }, data: { managerId: warehouse?.id } });

  const seededBudgets = [
    {
      code: 'BGT-IT-2026',
      name: 'IT Department Budget 2026',
      fiscalYear: 2026,
      period: 'FY',
      allocatedAmount: 500000000,
      departmentCode: 'IT',
    },
    {
      code: 'BGT-OPS-2026',
      name: 'Operations Department Budget 2026',
      fiscalYear: 2026,
      period: 'FY',
      allocatedAmount: 350000000,
      departmentCode: 'OPS',
    },
  ];

  for (const budget of seededBudgets) {
    const upsertedBudget = await prisma.budget.upsert({
      where: { code: budget.code },
      update: {
        name: budget.name,
        fiscalYear: budget.fiscalYear,
        period: budget.period,
        status: BudgetStatus.ACTIVE,
        allocatedAmount: budget.allocatedAmount,
        departmentId: departmentMap.get(budget.departmentCode),
        createdById: finance?.id,
        deletedAt: null,
      },
      create: {
        code: budget.code,
        name: budget.name,
        fiscalYear: budget.fiscalYear,
        period: budget.period,
        status: BudgetStatus.ACTIVE,
        allocatedAmount: budget.allocatedAmount,
        departmentId: departmentMap.get(budget.departmentCode)!,
        createdById: finance?.id,
      },
    });

    await prisma.budgetTransaction.upsert({
      where: { transactionNo: `ALLOC-${budget.code}` },
      update: {
        amount: budget.allocatedAmount,
        status: BudgetTransactionStatus.POSTED,
        createdById: finance?.id,
      },
      create: {
        transactionNo: `ALLOC-${budget.code}`,
        type: BudgetTransactionType.ALLOCATION,
        status: BudgetTransactionStatus.POSTED,
        amount: budget.allocatedAmount,
        currency: 'IDR',
        description: 'Initial seeded budget allocation',
        budgetId: upsertedBudget.id,
        createdById: finance?.id,
      },
    });
  }

  console.log('Seed completed. Demo password for all users: Password123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
