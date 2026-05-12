import { ItemsService } from '../items.service';

describe('ItemsService', () => {
  const prisma = {
    item: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    packagingUnit: {
      findFirst: jest.fn(),
    },
    supplier: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates items using uppercase SKU and default active status', async () => {
    prisma.packagingUnit.findFirst.mockResolvedValue({ id: 'unit-id' });
    prisma.supplier.findFirst.mockResolvedValue({ id: 'supplier-id' });
    prisma.item.create.mockResolvedValue({ id: 'item-id', sku: 'LAPTOP-STD-001' });
    const service = new ItemsService(prisma as never);

    await service.create({
      sku: 'laptop-std-001',
      name: 'Standard Business Laptop',
      defaultPackagingUnitId: 'unit-id',
      defaultSupplierId: 'supplier-id',
      estimatedUnitPrice: 12500000,
    });

    expect(prisma.item.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sku: 'LAPTOP-STD-001',
          isActive: true,
          estimatedUnitPrice: 12500000,
        }),
      }),
    );
  });

  it('rejects inactive or missing packaging unit references', async () => {
    prisma.packagingUnit.findFirst.mockResolvedValue(null);
    const service = new ItemsService(prisma as never);

    await expect(
      service.create({
        sku: 'ITEM-001',
        name: 'Test Item',
        defaultPackagingUnitId: 'missing-unit-id',
      }),
    ).rejects.toThrow('Default packaging unit does not exist or is inactive.');
  });
});
