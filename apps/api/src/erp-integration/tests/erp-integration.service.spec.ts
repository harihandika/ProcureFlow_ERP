import { ErpSyncOperation, ErpSyncStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { ErpIntegrationService } from '../erp-integration.service';

describe('ErpIntegrationService', () => {
  const tx = {
    erpSyncLog: {
      create: jest.fn(),
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
    erpSyncLog: {
      aggregate: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditTrailsService = {
    record: jest.fn(),
  };

  const user = {
    id: 'purchasing-user-id',
    email: 'purchasing@procureflow.test',
    fullName: 'Pandu Purchasing',
    departmentId: 'purchasing-department-id',
    roles: ['PURCHASING'],
  };

  const purchaseOrder = {
    id: 'po-id',
    poNumber: 'PO-2026-0001',
    status: PurchaseOrderStatus.ISSUED,
    issueDate: null,
    expectedDeliveryDate: null,
    totalAmount: new Prisma.Decimal(1000000),
    currency: 'IDR',
    erpExternalId: null,
    syncedAt: null,
    notes: null,
    purchaseRequestId: null,
    supplierId: 'supplier-id',
    warehouseId: 'warehouse-id',
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    supplier: { code: 'SUP-001', name: 'PT Supplier' },
    warehouse: { code: 'WH-MAIN', name: 'Main Warehouse' },
    items: [
      {
        id: 'po-item-id',
        description: null,
        quantityOrdered: new Prisma.Decimal(1),
        quantityReceived: new Prisma.Decimal(0),
        unitPrice: new Prisma.Decimal(1000000),
        lineTotal: new Prisma.Decimal(1000000),
        itemSkuSnapshot: 'LAPTOP-STD-001',
        itemNameSnapshot: 'Standard Business Laptop',
        unitCodeSnapshot: 'PCS',
        unitNameSnapshot: 'Piece',
        purchaseOrderId: 'po-id',
        purchaseRequestItemId: null,
        itemId: 'item-id',
        packagingUnitId: 'unit-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        item: { sku: 'LAPTOP-STD-001', name: 'Standard Business Laptop' },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (txClient: typeof tx) => unknown) => callback(tx));
    prisma.erpSyncLog.aggregate.mockResolvedValue({ _max: { attemptNo: null } });
  });

  it('syncs PO to mock ERP successfully and records audit', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    tx.erpSyncLog.create.mockResolvedValue({
      id: 'sync-log-id',
      status: ErpSyncStatus.SUCCESS,
      attemptNo: 1,
    });

    const service = new ErpIntegrationService(prisma as never, auditTrailsService as never);
    const result = await service.syncPurchaseOrder('po-id', { simulateStatus: ErpSyncStatus.SUCCESS }, user);

    expect(result.status).toBe(ErpSyncStatus.SUCCESS);
    expect(tx.erpSyncLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operation: ErpSyncOperation.CREATE_PO,
          status: ErpSyncStatus.SUCCESS,
          purchaseOrderId: 'po-id',
          triggeredById: user.id,
        }),
      }),
    );
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'po-id' },
        data: expect.objectContaining({ status: PurchaseOrderStatus.ISSUED }),
      }),
    );
    expect(auditTrailsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SYNC_ERP',
        entityType: 'PURCHASE_ORDER',
        entityId: 'po-id',
      }),
    );
  });

  it('creates failed ERP sync logs without updating the PO', async () => {
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    tx.erpSyncLog.create.mockResolvedValue({
      id: 'sync-log-id',
      status: ErpSyncStatus.FAILED,
      attemptNo: 1,
    });

    const service = new ErpIntegrationService(prisma as never, auditTrailsService as never);
    const result = await service.syncPurchaseOrder('po-id', { simulateStatus: ErpSyncStatus.FAILED }, user);

    expect(result.status).toBe(ErpSyncStatus.FAILED);
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('retries failed sync logs', async () => {
    prisma.erpSyncLog.findUnique.mockResolvedValue({
      id: 'failed-log-id',
      status: ErpSyncStatus.FAILED,
      operation: ErpSyncOperation.CREATE_PO,
      attemptNo: 1,
      maxAttempts: 3,
      purchaseOrderId: 'po-id',
    });
    prisma.purchaseOrder.findFirst.mockResolvedValue(purchaseOrder);
    tx.erpSyncLog.create.mockResolvedValue({
      id: 'retry-log-id',
      status: ErpSyncStatus.SUCCESS,
      attemptNo: 2,
    });

    const service = new ErpIntegrationService(prisma as never, auditTrailsService as never);
    const result = await service.retryFailedSync('failed-log-id', { simulateStatus: ErpSyncStatus.SUCCESS }, user);

    expect(result.id).toBe('retry-log-id');
    expect(tx.erpSyncLog.update).toHaveBeenCalledWith({
      where: { id: 'failed-log-id' },
      data: { status: ErpSyncStatus.RETRYING },
    });
    expect(tx.erpSyncLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          attemptNo: 2,
          previousSyncLogId: 'failed-log-id',
        }),
      }),
    );
    expect(auditTrailsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RETRY_ERP_SYNC',
        entityType: 'ERP_SYNC_LOG',
      }),
    );
  });

  it('rejects retry for non-failed sync logs', async () => {
    prisma.erpSyncLog.findUnique.mockResolvedValue({
      id: 'success-log-id',
      status: ErpSyncStatus.SUCCESS,
      attemptNo: 1,
      maxAttempts: 3,
      purchaseOrderId: 'po-id',
    });

    const service = new ErpIntegrationService(prisma as never, auditTrailsService as never);

    await expect(service.retryFailedSync('success-log-id', {}, user)).rejects.toThrow(
      'Only failed ERP sync logs can be retried.',
    );
  });
});
