import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PurchaseOrdersService } from './purchase-orders.service';

describe('PurchaseOrdersService status transitions', () => {
  const tx = {
    purchaseOrder: { findFirst: jest.fn(), update: jest.fn() },
    receiving: { count: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const audit = { record: jest.fn() };
  const user = { id: 'buyer-id', roles: ['PURCHASING'], departmentId: null };
  const order = {
    id: 'po-id', poNumber: 'PO-1', status: PurchaseOrderStatus.DRAFT,
    issueDate: null, items: [{ quantityReceived: new Prisma.Decimal(0) }], erpSyncLogs: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx));
    tx.receiving.count.mockResolvedValue(0);
    tx.purchaseOrder.update.mockImplementation(({ data }: { data: { status: PurchaseOrderStatus } }) => Promise.resolve({ ...order, status: data.status }));
  });

  it('issues a draft and records audit in the same serializable transaction', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue(order);
    const service = new PurchaseOrdersService(prisma as never, audit as never);
    await service.updateStatus('po-id', { status: PurchaseOrderStatus.ISSUED }, user as never);
    expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: 'Serializable' }));
    expect(tx.purchaseOrder.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: PurchaseOrderStatus.ISSUED, issueDate: expect.any(Date) }),
    }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'UPDATE' }), tx);
  });

  it.each([
    [PurchaseOrderStatus.DRAFT, PurchaseOrderStatus.DRAFT],
    [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.DRAFT],
    [PurchaseOrderStatus.PARTIALLY_RECEIVED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.ISSUED],
    [PurchaseOrderStatus.CANCELLED, PurchaseOrderStatus.ISSUED],
  ])('rejects transition %s to %s', async (current, next) => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ ...order, status: current });
    const service = new PurchaseOrdersService(prisma as never, audit as never);
    await expect(service.updateStatus('po-id', { status: next }, user as never)).rejects.toThrow('Cannot change purchase order status');
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled();
  });

  it('rejects cancelling an issued order with receiving history', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ ...order, status: PurchaseOrderStatus.ISSUED });
    tx.receiving.count.mockResolvedValue(1);
    const service = new PurchaseOrdersService(prisma as never, audit as never);
    await expect(service.updateStatus('po-id', { status: PurchaseOrderStatus.CANCELLED }, user as never)).rejects.toThrow('received items cannot be cancelled');
    expect(tx.purchaseOrder.update).not.toHaveBeenCalled();
  });
});
