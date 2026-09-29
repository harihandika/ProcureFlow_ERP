import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, InvoiceStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { serializableTransaction } from '../common/utils/serializable-transaction.util';
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
    return serializableTransaction(this.prisma, async (tx) => {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: purchaseOrderId, deletedAt: null },
        include: { items: true },
      });

      if (!po) throw new NotFoundException('Purchase Order not found');

      if (po.status !== PurchaseOrderStatus.RECEIVED) {
        throw new BadRequestException('Invoice can only be generated after the purchase order is fully received');
      }

      const existingInvoice = await tx.invoice.findFirst({
        where: { purchaseOrderId: po.id, deletedAt: null, status: { not: InvoiceStatus.CANCELLED } },
      });

      if (existingInvoice) {
        throw new BadRequestException('Active invoice already exists for this PO');
      }

      const invoiceNumber = `INV-${randomUUID()}`;
      let totalAmount = new Prisma.Decimal(0);

      // Validasi 3-Way Matching: kita invoice berdasarkan received quantity
      const itemsData = po.items
        .filter((item) => item.quantityReceived.gt(0))
        .map((item) => {
          const qty = item.quantityReceived;
          const price = item.unitPrice;
          const lineTotal = qty.mul(price).toDecimalPlaces(2);
          totalAmount = totalAmount.plus(lineTotal);

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

      const invoice = await tx.invoice.create({
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
      }, tx);

      return invoice;
    });
  }

  async payInvoice(id: string, user: AuthenticatedUser) {
    return serializableTransaction(this.prisma, async (tx) => {
      const invoice = await tx.invoice.findFirst({ where: { id, deletedAt: null } });
      if (!invoice) throw new NotFoundException('Invoice not found');

      if (invoice.status !== InvoiceStatus.UNPAID) {
        throw new BadRequestException('Only UNPAID invoices can be paid');
      }

      const updated = await tx.invoice.update({
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
      }, tx);

      return updated;
    });
  }
}
