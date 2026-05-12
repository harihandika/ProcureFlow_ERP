import { WarehousesService } from '../warehouses.service';

describe('WarehousesService', () => {
  const prisma = {
    warehouse: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates warehouses using uppercase codes', async () => {
    prisma.warehouse.create.mockResolvedValue({ id: 'warehouse-id', code: 'WH-MAIN' });
    const service = new WarehousesService(prisma as never);

    await service.create({ code: 'wh-main', name: 'Main Warehouse' });

    expect(prisma.warehouse.create).toHaveBeenCalledWith({
      data: {
        code: 'WH-MAIN',
        name: 'Main Warehouse',
        description: undefined,
        address: undefined,
        isActive: true,
      },
    });
  });

  it('throws when warehouse is not found', async () => {
    prisma.warehouse.findFirst.mockResolvedValue(null);
    const service = new WarehousesService(prisma as never);

    await expect(service.findOne('missing-id')).rejects.toThrow('Warehouse not found.');
  });
});
