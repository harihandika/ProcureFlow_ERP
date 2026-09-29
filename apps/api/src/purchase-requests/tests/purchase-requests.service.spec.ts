import { BudgetStatus, Prisma, PurchaseRequestPriority, PurchaseRequestStatus } from '@prisma/client';
import { PurchaseRequestsService } from '../purchase-requests.service';

describe('PurchaseRequestsService', () => {
  const tx = {
    department: { findFirst: jest.fn() },
    item: { findMany: jest.fn() },
    packagingUnit: { findMany: jest.fn() },
    budget: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    budgetTransaction: {
      create: jest.fn(),
    },
    purchaseRequest: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    purchaseRequestItem: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  const prisma = {
    department: {
      findFirst: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
    },
    item: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    packagingUnit: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    purchaseRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const auditTrailsService = {
    record: jest.fn(),
  };

  const requester = {
    id: 'requester-id',
    email: 'requester@procureflow.test',
    fullName: 'Rina Requester',
    departmentId: 'department-id',
    roles: ['REQUESTER'],
  };

  const activeBudget = {
    id: 'budget-id',
    code: 'BGT-IT-2026',
    departmentId: 'department-id',
    status: BudgetStatus.ACTIVE,
    currency: 'IDR',
    allocatedAmount: new Prisma.Decimal(1000000),
    reservedAmount: new Prisma.Decimal(100000),
    committedAmount: new Prisma.Decimal(0),
    consumedAmount: new Prisma.Decimal(0),
  };

  const draftPurchaseRequest = {
    id: 'pr-id',
    requestNumber: 'PR-202605110001-ABC123',
    title: 'Laptop request',
    description: null,
    status: PurchaseRequestStatus.DRAFT,
    priority: PurchaseRequestPriority.NORMAL,
    requiredDate: null,
    submittedAt: null,
    cancelledAt: null,
    totalAmount: new Prisma.Decimal(250000),
    currency: 'IDR',
    requesterId: requester.id,
    departmentId: 'department-id',
    budgetId: 'budget-id',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    requester: { id: requester.id, email: requester.email, fullName: requester.fullName },
    department: { id: 'department-id', code: 'IT', name: 'Information Technology' },
    budget: activeBudget,
    items: [
      {
        id: 'pr-item-id',
        purchaseRequestId: 'pr-id',
        itemId: 'item-id',
        packagingUnitId: 'unit-id',
        description: null,
        notes: null,
        quantity: new Prisma.Decimal(1),
        estimatedUnitPrice: new Prisma.Decimal(250000),
        lineTotal: new Prisma.Decimal(250000),
        itemSkuSnapshot: 'MOUSE-WL-001',
        itemNameSnapshot: 'Wireless Mouse',
        unitCodeSnapshot: 'PCS',
        unitNameSnapshot: 'Piece',
        createdAt: new Date(),
        updatedAt: new Date(),
        item: { id: 'item-id', sku: 'MOUSE-WL-001', name: 'Wireless Mouse' },
        packagingUnit: { id: 'unit-id', code: 'PCS', name: 'Piece' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    tx.purchaseRequest.findFirst.mockImplementation((args: unknown) => prisma.purchaseRequest.findFirst(args));
    tx.budget.findFirst.mockImplementation((args: unknown) => prisma.budget.findFirst(args));
    tx.department.findFirst.mockImplementation((args: unknown) => prisma.department.findFirst(args));
    tx.item.findMany.mockImplementation((args: unknown) => prisma.item.findMany(args));
    tx.packagingUnit.findMany.mockImplementation((args: unknown) => prisma.packagingUnit.findMany(args));
    prisma.$transaction.mockImplementation((callback: (txClient: typeof tx) => unknown) => callback(tx));
  });

  it('creates a draft purchase request with multiple items and snapshots', async () => {
    prisma.department.findFirst.mockResolvedValue({ id: 'department-id' });
    prisma.budget.findFirst.mockResolvedValue(activeBudget);
    prisma.item.findMany.mockResolvedValue([
      { id: 'item-1', sku: 'LAPTOP-STD-001', name: 'Standard Business Laptop' },
      { id: 'item-2', sku: 'MOUSE-WL-001', name: 'Wireless Mouse' }
    ]);
    prisma.packagingUnit.findMany.mockResolvedValue([{ id: 'unit-id', code: 'PCS', name: 'Piece' }]);
    prisma.purchaseRequest.create.mockResolvedValue(draftPurchaseRequest);

    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);
    await service.createDraft(
      {
        title: 'Laptop request',
        budgetId: 'budget-id',
        items: [
          { itemId: 'item-1', packagingUnitId: 'unit-id', quantity: 1, estimatedUnitPrice: 12500000 },
          { itemId: 'item-2', packagingUnitId: 'unit-id', quantity: 2, estimatedUnitPrice: 250000 },
        ],
      },
      requester,
    );

    expect(prisma.purchaseRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Laptop request',
          status: PurchaseRequestStatus.DRAFT,
          requesterId: requester.id,
          departmentId: 'department-id',
          budgetId: 'budget-id',
          currency: 'IDR',
          items: {
            create: expect.arrayContaining([
              expect.objectContaining({
                itemSkuSnapshot: 'LAPTOP-STD-001',
                unitCodeSnapshot: 'PCS',
              }),
            ]),
          },
        }),
      }),
    );
  });

  it('submits a draft PR and reserves available budget', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue(draftPurchaseRequest);
    prisma.budget.findFirst.mockResolvedValue(activeBudget);
    tx.budget.update.mockResolvedValue({});
    tx.budgetTransaction.create.mockResolvedValue({});
    tx.purchaseRequest.update.mockResolvedValue({
      ...draftPurchaseRequest,
      status: PurchaseRequestStatus.SUBMITTED,
      submittedAt: new Date(),
    });

    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);
    const result = await service.submit('pr-id', {}, requester);

    expect(tx.budget.update).toHaveBeenCalledWith({
      where: { id: 'budget-id' },
      data: {
        reservedAmount: new Prisma.Decimal(350000),
      },
    });
    expect(tx.budgetTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'RESERVATION',
          budgetId: 'budget-id',
          purchaseRequestId: 'pr-id',
          amount: new Prisma.Decimal(250000),
        }),
      }),
    );
    expect(auditTrailsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SUBMIT',
        entityId: 'pr-id',
        actorId: requester.id,
      }),
      tx,
    );
    expect(result.status).toBe(PurchaseRequestStatus.SUBMITTED);
  });

  it('rejects submit when available budget is insufficient', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({
      ...draftPurchaseRequest,
      totalAmount: new Prisma.Decimal(950000),
    });
    prisma.budget.findFirst.mockResolvedValue(activeBudget);

    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);

    await expect(service.submit('pr-id', {}, requester)).rejects.toThrow(
      'Purchase request total exceeds available budget.',
    );
  });

  it('rejects adding items to a non-draft purchase request', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({
      ...draftPurchaseRequest,
      status: PurchaseRequestStatus.SUBMITTED,
    });
    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);

    await expect(
      service.addItems(
        'pr-id',
        {
          items: [{ itemId: 'item-id', packagingUnitId: 'unit-id', quantity: 1, estimatedUnitPrice: 1000 }],
        },
        requester,
      ),
    ).rejects.toThrow('Only draft purchase requests can be changed.');
  });

  it('updates a draft using the transaction snapshot and records its audit atomically', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue(draftPurchaseRequest);
    prisma.department.findFirst.mockResolvedValue({ id: 'department-id' });
    prisma.budget.findFirst.mockResolvedValue(activeBudget);
    tx.purchaseRequest.update.mockResolvedValue({ ...draftPurchaseRequest, title: 'Updated' });
    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);

    await service.updateDraft('pr-id', { title: 'Updated' }, requester);

    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
    expect(prisma.purchaseRequest.findFirst).toHaveBeenCalledTimes(1);
    expect(tx.purchaseRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: 'Updated', totalAmount: draftPurchaseRequest.totalAmount }),
    }));
    expect(auditTrailsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }), tx);
  });

  it('adds items from the transaction total and rejects a submitted PR before any write', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValueOnce(draftPurchaseRequest).mockResolvedValueOnce({
      ...draftPurchaseRequest, status: PurchaseRequestStatus.SUBMITTED,
    });
    prisma.item.findMany.mockResolvedValue([{ id: 'item-id', sku: 'MOUSE-WL-001', name: 'Wireless Mouse' }]);
    prisma.packagingUnit.findMany.mockResolvedValue([{ id: 'unit-id', code: 'PCS', name: 'Piece' }]);
    tx.purchaseRequest.update.mockResolvedValue({ ...draftPurchaseRequest, totalAmount: new Prisma.Decimal(251000) });
    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);
    const dto = { items: [{ itemId: 'item-id', packagingUnitId: 'unit-id', quantity: 1, estimatedUnitPrice: 1000 }] };

    await service.addItems('pr-id', dto, requester);
    expect(tx.purchaseRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      data: { totalAmount: new Prisma.Decimal(251000) },
    }));
    expect(auditTrailsService.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }), tx);
    await expect(service.addItems('pr-id', dto, requester)).rejects.toThrow('Only draft');
    expect(tx.purchaseRequestItem.createMany).toHaveBeenCalledTimes(1);
  });

  it('does not let a query filter override the requester read scope', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const scopedPrisma = { purchaseRequest: { findMany, count }, $transaction: jest.fn((queries) => Promise.all(queries)) };
    const service = new PurchaseRequestsService(scopedPrisma as never, auditTrailsService as never);
    await service.findAll({ page: 1, limit: 10, requesterId: 'someone-else' }, requester);
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      requesterId: 'someone-else', AND: [{ requesterId: requester.id }],
    });
  });

  it('returns not found for a detail outside the manager department', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue(null);
    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);
    await expect(service.findOne('foreign-pr', { ...requester, roles: ['MANAGER'] })).rejects.toThrow('Purchase request not found.');
    expect(prisma.purchaseRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'foreign-pr', deletedAt: null, AND: [{ departmentId: requester.departmentId }] },
    }));
  });

  it('does not write a reservation for a request already submitted', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({ ...draftPurchaseRequest, status: PurchaseRequestStatus.SUBMITTED });
    const service = new PurchaseRequestsService(prisma as never, auditTrailsService as never);
    await expect(service.submit('pr-id', {}, requester)).rejects.toThrow('Only draft');
    expect(tx.budget.update).not.toHaveBeenCalled();
    expect(tx.budgetTransaction.create).not.toHaveBeenCalled();
  });
});
