import { Role, User, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../src/common/constants/roles';
import { PrismaService } from '../../src/prisma/prisma.service';

const roleDescriptions: Record<AppRole, string> = {
  [AppRole.Admin]: 'Test administrator role.',
  [AppRole.Finance]: 'Test finance role.',
  [AppRole.Manager]: 'Test manager role.',
  [AppRole.Requester]: 'Test requester role.',
  [AppRole.Purchasing]: 'Test purchasing role.',
  [AppRole.Warehouse]: 'Test warehouse role.',
};

const testUsers: Array<{ email: string; fullName: string; role: AppRole }> = [
  { email: 'admin.test@procureflow.local', fullName: 'Test Admin', role: AppRole.Admin },
  { email: 'finance.test@procureflow.local', fullName: 'Test Finance', role: AppRole.Finance },
  { email: 'manager.test@procureflow.local', fullName: 'Test Manager', role: AppRole.Manager },
  { email: 'requester.test@procureflow.local', fullName: 'Test Requester', role: AppRole.Requester },
  { email: 'purchasing.test@procureflow.local', fullName: 'Test Purchasing', role: AppRole.Purchasing },
  { email: 'warehouse.test@procureflow.local', fullName: 'Test Warehouse', role: AppRole.Warehouse },
];

export type SeededTestUsers = {
  password: string;
  roles: Record<AppRole, Role>;
  users: Record<AppRole, User>;
};

export async function seedRolesAndUsers(
  prisma: PrismaService,
  password = 'Password123!',
): Promise<SeededTestUsers> {
  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 4);
  const passwordHash = await bcrypt.hash(password, saltRounds);
  const roles = {} as Record<AppRole, Role>;
  const users = {} as Record<AppRole, User>;

  for (const roleName of Object.values(AppRole)) {
    roles[roleName] = await prisma.role.upsert({
      where: { name: roleName },
      update: {
        description: roleDescriptions[roleName],
        isSystem: true,
        deletedAt: null,
      },
      create: {
        name: roleName,
        description: roleDescriptions[roleName],
        isSystem: true,
      },
    });
  }

  for (const testUser of testUsers) {
    const user = await prisma.user.upsert({
      where: { email: testUser.email },
      update: {
        fullName: testUser.fullName,
        status: UserStatus.ACTIVE,
        passwordHash,
        deletedAt: null,
      },
      create: {
        email: testUser.email,
        username: testUser.email.split('@')[0],
        fullName: testUser.fullName,
        status: UserStatus.ACTIVE,
        passwordHash,
      },
    });

    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roles[testUser.role].id,
        },
      },
      update: {
        revokedAt: null,
      },
      create: {
        userId: user.id,
        roleId: roles[testUser.role].id,
      },
    });

    users[testUser.role] = user;
  }

  return {
    password,
    roles,
    users,
  };
}
