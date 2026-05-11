import { UserStatus } from '@prisma/client';
import { UsersService } from '../users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    department: {
      findFirst: jest.fn(),
    },
    role: {
      count: jest.fn(),
    },
    userRole: {
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a user without returning passwordHash', async () => {
    prisma.department.findFirst.mockResolvedValue({ id: 'dept-id' });
    prisma.role.count.mockResolvedValue(1);
    prisma.user.create.mockResolvedValue({
      id: 'user-id',
      email: 'requester@procureflow.test',
      username: 'requester',
      passwordHash: 'hashed',
      fullName: 'Rina Requester',
      jobTitle: null,
      phone: null,
      status: UserStatus.ACTIVE,
      departmentId: 'dept-id',
      department: null,
      roleAssignments: [{ role: { id: 'role-id', name: 'REQUESTER', description: null } }],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const service = new UsersService(prisma as never);
    const result = await service.create({
      email: 'Requester@ProcureFlow.Test',
      password: 'Password123!',
      fullName: 'Rina Requester',
      departmentId: 'dept-id',
      roleIds: ['role-id'],
    });

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'requester@procureflow.test',
          status: UserStatus.ACTIVE,
        }),
      }),
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.roles).toEqual([{ id: 'role-id', name: 'REQUESTER', description: null }]);
  });
});
