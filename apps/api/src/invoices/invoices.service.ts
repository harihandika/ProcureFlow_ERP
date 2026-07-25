import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, InvoiceStatus, PurchaseOrderStatus } from '@prisma/client';
import { AuditTrailsService } from '../audit-trails/audit-trails.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailsService: AuditTrailsService,
  ) {}

  async findAll() {
    return this.prisma.invoice.findMany({
      include: {
        supplier: { select: { name: true, code: true } },
        purchaseOrder: { select: { poNumber: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        supplier: true,
        purchaseOrder: true,
        items: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice with ID ${id} not found`);
    }

    return invoice;
  }

  async generateFromPo(purchaseOrderId: string, user: AuthenticatedUser) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Purchase Order not found');

    if (po.status !== PurchaseOrderStatus.RECEIVED && po.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED) {
      throw new BadRequestException('Cannot generate invoice for PO that has not been received');
    }

    const existingInvoice = await this.prisma.invoice.findFirst({
      where: { purchaseOrderId: po.id, status: { not: InvoiceStatus.CANCELLED } },
    });

    if (existingInvoice) {
      throw new BadRequestException('Active invoice already exists for this PO');
    }

    const invoiceNumber = `INV-${Date.now()}`;
    let totalAmount = 0;
    
    // Validasi 3-Way Matching: kita invoice berdasarkan received quantity
    const itemsData = po.items
      .filter((item) => Number(item.quantityReceived) > 0)
      .map((item) => {
        const qty = Number(item.quantityReceived);
        const price = Number(item.unitPrice);
        const lineTotal = qty * price;
        totalAmount += lineTotal;

        return {
          description: item.description || item.itemNameSnapshot,
          quantity: qty,
          unitPrice: price,
          lineTotal: lineTotal,
        };
      });

    if (itemsData.length === 0) {
      throw new BadRequestException('No received items to invoice');
    }

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        status: InvoiceStatus.UNPAID,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Net 30
        totalAmount,
        currency: po.currency,
        purchaseOrderId: po.id,
        supplierId: po.supplierId,
        items: {
          create: itemsData,
        },
      },
      include: { items: true },
    });

    await this.auditTrailsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.INVOICE,
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
      actorId: user.id,
      after: invoice,
    });

    return invoice;
  }

  async payInvoice(id: string, user: AuthenticatedUser) {
    const invoice = await this.findOne(id);

    if (invoice.status !== InvoiceStatus.UNPAID) {
      throw new BadRequestException('Only UNPAID invoices can be paid');
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.PAID,
        paidAt: new Date(),
      },
    });

    await this.auditTrailsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.INVOICE,
      entityId: invoice.id,
      entityLabel: invoice.invoiceNumber,
      actorId: user.id,
      before: { status: InvoiceStatus.UNPAID },
      after: { status: InvoiceStatus.PAID, paidAt: updated.paidAt },
    });

    return updated;
  }
}
