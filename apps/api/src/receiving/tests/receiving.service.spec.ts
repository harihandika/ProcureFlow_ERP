import { Prisma, PurchaseOrderStatus, ReceivingStatus } from '@prisma/client';
import { ReceivingService } from '../receiving.service';

describe('ReceivingService', () => {
  const tx = {
    receiving: {
      create: jest.fn(),
    },
    purchaseOrderItem: {
      update: jest.fn(),
    },
    purchaseOrder: {
      update: jest.fn(),
    },
  };

  const prisma = {
    purchaseOrder: {
      findFirst: jest.fn(),
    },
    receiving: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditTrailsService = {
    record: jest.fn(),
  };

  const warehouseUser = {
    id: 'warehouse-user-id',
    email: 'warehouse@procureflow.test',
    fullName: 'Wahyu Warehouse',
    departmentId: 'warehouse-department-id',
    roles: ['WAREHOUSE'],
  };

  const purchaseOrder = {
    id: 'po-id',
    poNumber: 'PO-2026-0001',
    status: PurchaseOrderStatus.ISSUED,
    issueDate: null,
    expectedDeliveryDate: null,
    totalAmount: new Prisma.Decimal(25000000),
    currency: 'IDR',
    notes: null,
    purchaseRequestId: null,
    supplierId: 'supplier-id',
    warehouseId: 'warehouse-id',
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    warehouse: { id: 'warehouse-id', code: 'WH-MAIN', name: 'Main Warehouse' },
    items: [
      {
        id: 'po-item-1',
        description: null,
        quantityOrdered: new Prisma.Decimal(5),
        quantityReceived: new Prisma.Decimal(1),
        unitPrice: new Prisma.Decimal(1000000),
        lineTotal: new Prisma.Decimal(5000000),
        itemSkuSnapshot: 'LAPTOP-STD-001',
        itemNameSnapshot: 'Standard Business Laptop',
        unitCodeSnapshot: 'PCS',
        unitNameSnapshot: 'Piece',
        purchaseOrderId: 'po-id',
        purchaseRequestItemId: null,
        itemId: 'item-1',
        packagingUnitId: 'unit-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        item: { id: 'item-1', sku: 'LAPTOP-STD-001', name: 'Standard Business Laptop' },
        packagingUnit: { id: 'unit-id', code: 'PCS', name: 'Piece' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (txClient: typeof tx) => unknown) => callback(tx));
    tx.receiving.create.mockResolvedValue({
      id: 'receiving-id',
      receivingNumber: 'GRN-202605110001',
      status: ReceivingStatus.PARTIAL,
      items: [{ id: 'receiving-item-id' }],
    });
  });

  it('receives PO items by scanned item code and marks PO partially received', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    const service = new ReceivingService(prisma as never, auditTrailsService as never);

    const result = await service.receive(
      {
        purchaseOrderId: 'po-id',
        items: [{ itemCode: 'laptop-std-001', quantityReceived: 2 }],
      },
      warehouseUser,
    );

    expect(tx.receiving.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReceivingStatus.PARTIAL,
          purchaseOrderId: 'po-id',
          warehouseId: 'warehouse-id',
          receivedById: 'warehouse-user-id',
          items: {
            create: [
              expect.objectContaining({
                purchaseOrderItemId: 'po-item-1',
                itemId: 'item-1',
                scannedCode: 'LAPTOP-STD-001',
                quantityReceived: new Prisma.Decimal(2),
              }),
            ],
          },
        }),
      }),
    );
    expect(tx.purchaseOrderItem.update).toHaveBeenCalledWith({
      where: { id: 'po-item-1' },
      data: { quantityReceived: new Prisma.Decimal(3) },
    });
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'po-id' },
      data: { status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });
    expect(auditTrailsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECEIVE',
        entityType: 'RECEIVING',
        entityId: 'receiving-id',
        entityLabel: 'GRN-202605110001',
        actorId: 'warehouse-user-id',
      }),
    );
    expect(result).toEqual({
      id: 'receiving-id',
      receivingNumber: 'GRN-202605110001',
      status: ReceivingStatus.PARTIAL,
      items: [{ id: 'receiving-item-id' }],
    });
  });

  it('marks PO received when all quantities are fulfilled', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    tx.receiving.create.mockResolvedValue({
      id: 'receiving-id',
      receivingNumber: 'GRN-202605110002',
      status: ReceivingStatus.FULL,
      items: [{ id: 'receiving-item-id' }],
    });
    const service = new ReceivingService(prisma as never, auditTrailsService as never);

    await service.receive(
      {
        purchaseOrderId: 'po-id',
        items: [{ purchaseOrderItemId: 'po-item-1', quantityReceived: 4 }],
      },
      warehouseUser,
    );

    expect(tx.purchaseOrder.update).toHaveBeenCalledWith({
      where: { id: 'po-id' },
      data: { status: PurchaseOrderStatus.RECEIVED },
    });
    expect(tx.receiving.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ReceivingStatus.FULL,
        }),
      }),
    );
  });

  it('rejects over receiving', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    const service = new ReceivingService(prisma as never, auditTrailsService as never);

    await expect(
      service.receive(
        {
          purchaseOrderId: 'po-id',
          items: [{ purchaseOrderItemId: 'po-item-1', quantityReceived: 5 }],
        },
        warehouseUser,
      ),
    ).rejects.toThrow('Receiving quantity cannot exceed ordered quantity.');
  });

  it('rejects scanned item codes that are not on the PO', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    const service = new ReceivingService(prisma as never, auditTrailsService as never);

    await expect(
      service.receive(
        {
          purchaseOrderId: 'po-id',
          items: [{ itemCode: 'UNKNOWN-SKU', quantityReceived: 1 }],
        },
        warehouseUser,
      ),
    ).rejects.toThrow('Scanned item code was not found on this purchase order.');
  });
});
