import { BudgetStatus, Prisma, PurchaseRequestPriority, PurchaseRequestStatus } from '@prisma/client';
import { PurchaseRequestsService } from '../purchase-requests.service';

describe('PurchaseRequestsService', () => {
  const tx = {
    budget: {
      update: jest.fn(),
    },
    budgetTransaction: {
      create: jest.fn(),
    },
    purchaseRequest: {
      update: jest.fn(),
    },
    purchaseRequestItem: {
      createMany: jest.fn(),
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
    },
    packagingUnit: {
      findFirst: jest.fn(),
    },
    purchaseRequest: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
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
    prisma.$transaction.mockImplementation((callback: (txClient: typeof tx) => unknown) => callback(tx));
  });

  it('creates a draft purchase request with multiple items and snapshots', async () => {
    prisma.department.findFirst.mockResolvedValue({ id: 'department-id' });
    prisma.budget.findFirst.mockResolvedValue(activeBudget);
    prisma.item.findFirst
      .mockResolvedValueOnce({ id: 'item-1', sku: 'LAPTOP-STD-001', name: 'Standard Business Laptop' })
      .mockResolvedValueOnce({ id: 'item-2', sku: 'MOUSE-WL-001', name: 'Wireless Mouse' });
    prisma.packagingUnit.findFirst.mockResolvedValue({ id: 'unit-id', code: 'PCS', name: 'Piece' });
    prisma.purchaseRequest.create.mockResolvedValue(draftPurchaseRequest);

    const service = new PurchaseRequestsService(prisma as never);
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

    const service = new PurchaseRequestsService(prisma as never);
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
    expect(result.status).toBe(PurchaseRequestStatus.SUBMITTED);
  });

  it('rejects submit when available budget is insufficient', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({
      ...draftPurchaseRequest,
      totalAmount: new Prisma.Decimal(950000),
    });
    prisma.budget.findFirst.mockResolvedValue(activeBudget);

    const service = new PurchaseRequestsService(prisma as never);

    await expect(service.submit('pr-id', {}, requester)).rejects.toThrow(
      'Purchase request total exceeds available budget.',
    );
  });

  it('rejects adding items to a non-draft purchase request', async () => {
    prisma.purchaseRequest.findFirst.mockResolvedValue({
      ...draftPurchaseRequest,
      status: PurchaseRequestStatus.SUBMITTED,
    });
    const service = new PurchaseRequestsService(prisma as never);

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
});
