import { InvoiceStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { InvoicesService } from './invoices.service';

describe('InvoicesService', () => {
  const user = { id: 'finance', email: 'f@test', fullName: 'Finance', departmentId: null, roles: ['FINANCE'] };
  const tx = { purchaseOrder: { findFirst: jest.fn() }, invoice: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() } };
  const prisma = { $transaction: jest.fn() };
  const audit = { record: jest.fn() };
  let service: InvoicesService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.purchaseOrder.findFirst.mockResolvedValue({ id: 'po', status: PurchaseOrderStatus.RECEIVED, currency: 'IDR', supplierId: 'supplier', items: [
      { description: null, itemNameSnapshot: 'Item', quantityReceived: new Prisma.Decimal('3'), unitPrice: new Prisma.Decimal('0.10') },
    ] });
    tx.invoice.findFirst.mockResolvedValue(null);
    tx.invoice.create.mockImplementation(({ data }) => Promise.resolve({ id: 'invoice', ...data }));
    service = new InvoicesService(prisma as never, audit as never);
  });

  it('rejects partial receipt without creating an invoice', async () => {
    tx.purchaseOrder.findFirst.mockResolvedValue({ status: PurchaseOrderStatus.PARTIALLY_RECEIVED });
    await expect(service.generateFromPo('po', user)).rejects.toThrow('fully received');
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it('uses Decimal for accurate amounts and a transactional audit', async () => {
    const invoice = await service.generateFromPo('po', user);
    expect(invoice.totalAmount.toString()).toBe('0.3');
    expect(tx.invoice.create.mock.calls[0][0].data.items.create[0].lineTotal.toString()).toBe('0.3');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'invoice' }), tx);
  });

  it('refuses a second active invoice including an already paid invoice', async () => {
    tx.invoice.findFirst.mockResolvedValue({ status: InvoiceStatus.PAID });
    await expect(service.generateFromPo('po', user)).rejects.toThrow('Active invoice already exists');
    expect(tx.invoice.create).not.toHaveBeenCalled();
  });

  it('only pays an unpaid invoice and records the decision in its transaction', async () => {
    tx.invoice.findFirst.mockResolvedValue({ id: 'invoice', invoiceNumber: 'INV-1', status: InvoiceStatus.UNPAID });
    tx.invoice.update.mockResolvedValue({ status: InvoiceStatus.PAID, paidAt: new Date() });
    await service.payInvoice('invoice', user);
    expect(tx.invoice.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'PAID' }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ before: { status: 'UNPAID' } }), tx);
    tx.invoice.findFirst.mockResolvedValue({ status: InvoiceStatus.PAID });
    await expect(service.payInvoice('invoice', user)).rejects.toThrow('Only UNPAID');
    expect(tx.invoice.update).toHaveBeenCalledTimes(1);
  });
});
