import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma, PurchaseOrderStatus, ReceivingStatus } from '@prisma/client';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { ReceivePoItemDto } from './dto/receive-po-item.dto';
import { AuditTrailsService } from '../audit-trails/audit-trails.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

const purchaseOrderInclude = {
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  items: {
    include: {
      item: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
      },
      packagingUnit: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.PurchaseOrderInclude;

const receivingInclude = {
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      status: true,
    },
  },
  warehouse: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  receivedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  items: {
    include: {
      item: {
        select: {
          id: true,
          sku: true,
          name: true,
        },
      },
      purchaseOrderItem: {
        select: {
          id: true,
          itemSkuSnapshot: true,
          itemNameSnapshot: true,
          quantityOrdered: true,
          quantityReceived: true,
        },
      },
    },
  },
} satisfies Prisma.ReceivingInclude;

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseOrderInclude }>;
type PurchaseOrderItemWithRelations = PurchaseOrderWithItems['items'][number];

interface PreparedReceivingItem {
  purchaseOrderItem: PurchaseOrderItemWithRelations;
  quantityReceived: Prisma.Decimal;
  quantityAccepted: Prisma.Decimal;
  quantityRejected: Prisma.Decimal;
  scannedCode?: string;
  remarks?: string;
}

@Injectable()
export class ReceivingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailsService: AuditTrailsService,
  ) {}

  async receive(dto: CreateReceivingDto, user: AuthenticatedUser) {
    const purchaseOrder = await this.findReceivablePurchaseOrder(dto.purchaseOrderId);
    const warehouseId = dto.warehouseId ?? purchaseOrder.warehouseId;

    if (warehouseId !== purchaseOrder.warehouseId) {
      throw new BadRequestException('Receiving warehouse must match the purchase order warehouse.');
    }

    const preparedItems = this.prepareReceivingItems(purchaseOrder, dto.items);
    const quantityByPurchaseOrderItemId = this.aggregateQuantities(preparedItems);
    this.validateNoOverReceiving(purchaseOrder, quantityByPurchaseOrderItemId);

    const nextPurchaseOrderStatus = this.getNextPurchaseOrderStatus(purchaseOrder, quantityByPurchaseOrderItemId);
    const receivingStatus =
      nextPurchaseOrderStatus === PurchaseOrderStatus.RECEIVED ? ReceivingStatus.FULL : ReceivingStatus.PARTIAL;

    const receiving = await this.prisma.$transaction(async (tx) => {
      const receiving = await tx.receiving.create({
        data: {
          receivingNumber: this.generateReceivingNumber(),
          status: receivingStatus,
          deliveryNoteNo: dto.deliveryNoteNo,
          remarks: dto.remarks,
          purchaseOrderId: purchaseOrder.id,
          warehouseId,
          receivedById: user.id,
          items: {
            create: preparedItems.map((preparedItem) => ({
              purchaseOrderItemId: preparedItem.purchaseOrderItem.id,
              itemId: preparedItem.purchaseOrderItem.itemId,
              scannedCode: preparedItem.scannedCode,
              quantityReceived: preparedItem.quantityReceived,
              quantityAccepted: preparedItem.quantityAccepted,
              quantityRejected: preparedItem.quantityRejected,
              remarks: preparedItem.remarks,
            })),
          },
        },
        include: receivingInclude,
      });

      for (const [purchaseOrderItemId, quantityReceived] of quantityByPurchaseOrderItemId.entries()) {
        const purchaseOrderItem = purchaseOrder.items.find((item) => item.id === purchaseOrderItemId);

        await tx.purchaseOrderItem.update({
          where: { id: purchaseOrderItemId },
          data: {
            quantityReceived: purchaseOrderItem!.quantityReceived.plus(quantityReceived),
          },
        });
      }

      await tx.purchaseOrder.update({
        where: { id: purchaseOrder.id },
        data: { status: nextPurchaseOrderStatus },
      });

      return receiving;
    });

    await this.auditTrailsService.record({
      action: AuditAction.RECEIVE,
      entityType: AuditEntityType.RECEIVING,
      entityId: receiving.id,
      entityLabel: receiving.receivingNumber,
      actorId: user.id,
      after: receiving,
      metadata: {
        purchaseOrderId: purchaseOrder.id,
        poNumber: purchaseOrder.poNumber,
        status: receiving.status,
        itemCount: receiving.items.length,
      },
    });

    return receiving;
  }

  async findOne(id: string) {
    const receiving = await this.prisma.receiving.findFirst({
      where: { id, deletedAt: null },
      include: receivingInclude,
    });

    if (!receiving) {
      throw new NotFoundException('Receiving record not found.');
    }

    return receiving;
  }

  async findByPurchaseOrder(purchaseOrderId: string) {
    return this.prisma.receiving.findMany({
      where: {
        purchaseOrderId,
        deletedAt: null,
      },
      include: receivingInclude,
      orderBy: { receivedAt: 'desc' },
    });
  }

  private async findReceivablePurchaseOrder(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: purchaseOrderInclude,
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found.');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled purchase orders cannot be received.');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Purchase order is already fully received.');
    }

    if (!purchaseOrder.items.length) {
      throw new BadRequestException('Purchase order has no items to receive.');
    }

    return purchaseOrder;
  }

  private prepareReceivingItems(purchaseOrder: PurchaseOrderWithItems, inputs: ReceivePoItemDto[]) {
    return inputs.map((input) => {
      const purchaseOrderItem = this.resolvePurchaseOrderItem(purchaseOrder, input);
      const quantityReceived = new Prisma.Decimal(input.quantityReceived);
      const quantityRejected = new Prisma.Decimal(input.quantityRejected ?? 0);
      const quantityAccepted = new Prisma.Decimal(input.quantityAccepted ?? input.quantityReceived).minus(
        input.quantityAccepted === undefined && input.quantityRejected !== undefined ? quantityRejected : 0,
      );

      if (quantityAccepted.lt(0)) {
        throw new BadRequestException('Accepted quantity cannot be negative.');
      }

      if (quantityAccepted.plus(quantityRejected).gt(quantityReceived)) {
        throw new BadRequestException('Accepted and rejected quantity cannot exceed received quantity.');
      }

      return {
        purchaseOrderItem,
        quantityReceived,
        quantityAccepted,
        quantityRejected,
        scannedCode: input.itemCode?.trim().toUpperCase(),
        remarks: input.remarks,
      };
    });
  }

  private resolvePurchaseOrderItem(purchaseOrder: PurchaseOrderWithItems, input: ReceivePoItemDto) {
    if (input.purchaseOrderItemId) {
      const purchaseOrderItem = purchaseOrder.items.find((item) => item.id === input.purchaseOrderItemId);

      if (!purchaseOrderItem) {
        throw new BadRequestException('Purchase order item does not belong to this purchase order.');
      }

      return purchaseOrderItem;
    }

    if (!input.itemCode) {
      throw new BadRequestException('Either purchaseOrderItemId or itemCode is required.');
    }

    const normalizedCode = input.itemCode.trim().toUpperCase();
    const matches = purchaseOrder.items.filter(
      (item) => item.itemSkuSnapshot.toUpperCase() === normalizedCode || item.item.sku.toUpperCase() === normalizedCode,
    );

    if (!matches.length) {
      throw new BadRequestException('Scanned item code was not found on this purchase order.');
    }

    if (matches.length > 1) {
      throw new BadRequestException('Scanned item code matches multiple purchase order lines.');
    }

    return matches[0];
  }

  private aggregateQuantities(preparedItems: PreparedReceivingItem[]) {
    const quantityByPurchaseOrderItemId = new Map<string, Prisma.Decimal>();

    for (const preparedItem of preparedItems) {
      const current = quantityByPurchaseOrderItemId.get(preparedItem.purchaseOrderItem.id) ?? new Prisma.Decimal(0);
      quantityByPurchaseOrderItemId.set(
        preparedItem.purchaseOrderItem.id,
        current.plus(preparedItem.quantityReceived),
      );
    }

    return quantityByPurchaseOrderItemId;
  }

  private validateNoOverReceiving(
    purchaseOrder: PurchaseOrderWithItems,
    quantityByPurchaseOrderItemId: Map<string, Prisma.Decimal>,
  ) {
    for (const [purchaseOrderItemId, quantityReceived] of quantityByPurchaseOrderItemId.entries()) {
      const purchaseOrderItem = purchaseOrder.items.find((item) => item.id === purchaseOrderItemId);

      if (!purchaseOrderItem) {
        throw new BadRequestException('Purchase order item does not belong to this purchase order.');
      }

      const nextQuantityReceived = purchaseOrderItem.quantityReceived.plus(quantityReceived);

      if (nextQuantityReceived.gt(purchaseOrderItem.quantityOrdered)) {
        throw new BadRequestException('Receiving quantity cannot exceed ordered quantity.');
      }
    }
  }

  private getNextPurchaseOrderStatus(
    purchaseOrder: PurchaseOrderWithItems,
    quantityByPurchaseOrderItemId: Map<string, Prisma.Decimal>,
  ) {
    const isFullyReceived = purchaseOrder.items.every((item) => {
      const receivedInThisReceipt = quantityByPurchaseOrderItemId.get(item.id) ?? new Prisma.Decimal(0);
      return item.quantityReceived.plus(receivedInThisReceipt).gte(item.quantityOrdered);
    });

    return isFullyReceived ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED;
  }

  private generateReceivingNumber() {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `GRN-${timestamp}-${random}`;
  }
}
