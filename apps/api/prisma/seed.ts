import { PrismaClient, UserStatus } from '@prisma/client';
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

  const roleMap = new Map((await prisma.role.findMany()).map((role) => [role.name, role.id]));
  const departmentMap = new Map((await prisma.department.findMany()).map((department) => [department.code, department.id]));

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
