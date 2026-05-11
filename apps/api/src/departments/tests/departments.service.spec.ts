import { DepartmentsService } from '../departments.service';

describe('DepartmentsService', () => {
  const prisma = {
    department: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates departments using uppercase codes', async () => {
    prisma.department.create.mockResolvedValue({ id: 'dept-id', code: 'IT' });
    const service = new DepartmentsService(prisma as never);

    await service.create({ code: 'it', name: 'Information Technology' });

    expect(prisma.department.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'IT',
          name: 'Information Technology',
          isActive: true,
        }),
      }),
    );
  });

  it('rejects an unknown manager id', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const service = new DepartmentsService(prisma as never);

    await expect(
      service.create({ code: 'OPS', name: 'Operations', managerId: '44f11c34-72db-41bf-86a8-d02b582c56ba' }),
    ).rejects.toThrow('Manager user does not exist.');
  });
});
