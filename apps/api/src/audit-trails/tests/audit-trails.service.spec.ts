import { AuditAction, AuditEntityType } from '@prisma/client';
import { AuditTrailsService } from '../audit-trails.service';

describe('AuditTrailsService', () => {
  const prisma = {
    auditTrail: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('records audit trail entries', async () => {
    prisma.auditTrail.create.mockResolvedValue({ id: 'audit-id' });
    const service = new AuditTrailsService(prisma as never);

    await service.record({
      action: AuditAction.SYNC_ERP,
      entityType: AuditEntityType.PURCHASE_ORDER,
      entityId: '1c1d7d76-5b5d-4ce0-8b13-4aa8bbdc6992',
      actorId: '2c1d7d76-5b5d-4ce0-8b13-4aa8bbdc6992',
      metadata: { status: 'SUCCESS' },
    });

    expect(prisma.auditTrail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: AuditAction.SYNC_ERP,
        entityType: AuditEntityType.PURCHASE_ORDER,
        metadata: { status: 'SUCCESS' },
      }),
    });
  });

  it('throws when audit detail is missing', async () => {
    prisma.auditTrail.findUnique.mockResolvedValue(null);
    const service = new AuditTrailsService(prisma as never);

    await expect(service.findOne('missing-id')).rejects.toThrow('Audit trail record not found.');
  });
});
