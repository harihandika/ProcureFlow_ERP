import { PackagingUnitsService } from '../packaging-units.service';

describe('PackagingUnitsService', () => {
  const prisma = {
    packagingUnit: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates packaging units using uppercase codes', async () => {
    prisma.packagingUnit.create.mockResolvedValue({ id: 'unit-id', code: 'PCS' });
    const service = new PackagingUnitsService(prisma as never);

    await service.create({ code: 'pcs', name: 'Piece' });

    expect(prisma.packagingUnit.create).toHaveBeenCalledWith({
      data: {
        code: 'PCS',
        name: 'Piece',
        description: undefined,
        isActive: true,
      },
    });
  });

  it('throws when packaging unit is not found', async () => {
    prisma.packagingUnit.findFirst.mockResolvedValue(null);
    const service = new PackagingUnitsService(prisma as never);

    await expect(service.findOne('missing-id')).rejects.toThrow('Packaging unit not found.');
  });
});
