import { SuppliersService } from '../suppliers.service';

describe('SuppliersService', () => {
  const prisma = {
    supplier: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates suppliers using uppercase codes and lowercase emails', async () => {
    prisma.supplier.create.mockResolvedValue({ id: 'supplier-id', code: 'SUP-001' });
    const service = new SuppliersService(prisma as never);

    await service.create({
      code: 'sup-001',
      name: 'PT Nusantara Office Supplies',
      email: 'SALES@SUPPLIER.TEST',
    });

    expect(prisma.supplier.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'SUP-001',
        email: 'sales@supplier.test',
        isActive: true,
      }),
    });
  });

  it('throws when supplier is not found', async () => {
    prisma.supplier.findFirst.mockResolvedValue(null);
    const service = new SuppliersService(prisma as never);

    await expect(service.findOne('missing-id')).rejects.toThrow('Supplier not found.');
  });
});
