import { RolesService } from '../roles.service';

describe('RolesService', () => {
  const prisma = {
    role: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates roles using uppercase names', async () => {
    prisma.role.create.mockResolvedValue({ id: 'role-id', name: 'ADMIN' });
    const service = new RolesService(prisma as never);

    await service.create({ name: 'admin', description: 'Admin role' });

    expect(prisma.role.create).toHaveBeenCalledWith({
      data: {
        name: 'ADMIN',
        description: 'Admin role',
        isSystem: false,
      },
    });
  });

  it('does not soft delete system roles', async () => {
    prisma.role.findFirst.mockResolvedValue({ id: 'role-id', name: 'ADMIN', isSystem: true });
    const service = new RolesService(prisma as never);

    await expect(service.remove('role-id')).rejects.toThrow('System roles cannot be deleted.');
  });
});
