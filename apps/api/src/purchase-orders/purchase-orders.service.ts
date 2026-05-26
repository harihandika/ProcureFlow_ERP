import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma, PurchaseOrderStatus, PurchaseRequestStatus } from '@prisma/client';
import { GeneratePurchaseOrderDto } from './dto/generate-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { AuditTrailsService } from '../audit-trails/audit-trails.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const purchaseOrderInclude = {
  purchaseRequest: {
    select: {
      id: true,
      requestNumber: true,
      title: true,
      status: true,
      requester: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      department: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      budget: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  },
  supplier: true,
  warehouse: true,
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  items: {
    orderBy: { createdAt: 'asc' },
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
  erpSyncLogs: {
    orderBy: { createdAt: 'desc' },
    take: 1,
  },
} satisfies Prisma.PurchaseOrderInclude;

const approvedPurchaseRequestInclude = {
  requester: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  budget: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      item: true,
      packagingUnit: true,
    },
  },
} satisfies Prisma.PurchaseRequestInclude;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{ include: typeof purchaseOrderInclude }>;

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailsService: AuditTrailsService,
  ) {}

  async findAll(query: PurchaseOrderQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PurchaseOrderWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.supplierId ? { supplierId: query.supplierId } : {}),
      ...(query.purchaseRequestId ? { purchaseRequestId: query.purchaseRequestId } : {}),
      ...(query.search
        ? {
            OR: [
              { poNumber: { contains: query.search, mode: 'insensitive' } },
              { supplier: { name: { contains: query.search, mode: 'insensitive' } } },
              { purchaseRequest: { requestNumber: { contains: query.search, mode: 'insensitive' } } },
              { purchaseRequest: { title: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseOrder.findMany({
        where,
        include: purchaseOrderInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return toPaginatedResult(data.map((purchaseOrder) => this.toResponse(purchaseOrder)), total, page, limit);
  }

  async findOne(id: string) {
    const purchaseOrder = await this.findPurchaseOrderOrThrow(id);

    return this.toResponse(purchaseOrder);
  }

  async generateFromPurchaseRequest(prId: string, dto: GeneratePurchaseOrderDto, user: AuthenticatedUser) {
    const purchaseRequest = await this.prisma.purchaseRequest.findFirst({
      where: { id: prId, deletedAt: null },
      include: approvedPurchaseRequestInclude,
    });

    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found.');
    }

    if (purchaseRequest.status !== PurchaseRequestStatus.APPROVED) {
      throw new BadRequestException('Only approved purchase requests can be converted to purchase orders.');
    }

    if (!purchaseRequest.items.length) {
      throw new BadRequestException('Purchase request has no items to convert.');
    }

    const [supplier, warehouse, existingPurchaseOrder] = await Promise.all([
      this.prisma.supplier.findFirst({
        where: { id: dto.supplierId, deletedAt: null, isActive: true },
      }),
      this.prisma.warehouse.findFirst({
        where: { deletedAt: null, isActive: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.purchaseOrder.findFirst({
        where: { purchaseRequestId: prId, deletedAt: null },
      }),
    ]);

    if (!supplier) {
      throw new BadRequestException('Supplier does not exist or is inactive.');
    }

    if (!warehouse) {
      throw new BadRequestException('At least one active warehouse is required before generating a purchase order.');
    }

    if (existingPurchaseOrder) {
      throw new BadRequestException('A purchase order has already been generated for this purchase request.');
    }

    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        poNumber: this.generatePoNumber(),
        status: PurchaseOrderStatus.DRAFT,
        expectedDeliveryDate: purchaseRequest.requiredDate,
        totalAmount: purchaseRequest.totalAmount,
        currency: purchaseRequest.currency,
        purchaseRequestId: purchaseRequest.id,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        createdById: user.id,
        items: {
          create: purchaseRequest.items.map((item) => ({
            purchaseRequestItemId: item.id,
            itemId: item.itemId,
            packagingUnitId: item.packagingUnitId,
            description: item.description,
            quantityOrdered: item.quantity,
            quantityReceived: 0,
            unitPrice: item.estimatedUnitPrice,
            lineTotal: item.lineTotal,
            itemSkuSnapshot: item.itemSkuSnapshot,
            itemNameSnapshot: item.itemNameSnapshot,
            unitCodeSnapshot: item.unitCodeSnapshot,
            unitNameSnapshot: item.unitNameSnapshot,
          })),
        },
      },
      include: purchaseOrderInclude,
    });

    await this.auditTrailsService.record({
      action: AuditAction.CREATE,
      entityType: AuditEntityType.PURCHASE_ORDER,
      entityId: purchaseOrder.id,
      entityLabel: purchaseOrder.poNumber,
      actorId: user.id,
      after: { status: purchaseOrder.status, purchaseRequestId: purchaseRequest.id, supplierId: supplier.id },
    });

    return this.toResponse(purchaseOrder);
  }

  async updateStatus(id: string, dto: UpdatePurchaseOrderStatusDto, user: AuthenticatedUser) {
    if (dto.status === PurchaseOrderStatus.PARTIALLY_RECEIVED || dto.status === PurchaseOrderStatus.RECEIVED) {
      throw new BadRequestException('Receiving statuses are managed by the receiving module.');
    }

    const purchaseOrder = await this.findPurchaseOrderOrThrow(id);

    const updatedPurchaseOrder = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: dto.status,
        issueDate: dto.status === PurchaseOrderStatus.ISSUED && !purchaseOrder.issueDate ? new Date() : purchaseOrder.issueDate,
      },
      include: purchaseOrderInclude,
    });

    await this.auditTrailsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PURCHASE_ORDER,
      entityId: updatedPurchaseOrder.id,
      entityLabel: updatedPurchaseOrder.poNumber,
      actorId: user.id,
      before: { status: purchaseOrder.status },
      after: { status: updatedPurchaseOrder.status },
    });

    return this.toResponse(updatedPurchaseOrder);
  }

  private async findPurchaseOrderOrThrow(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: purchaseOrderInclude,
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found.');
    }

    return purchaseOrder;
  }

  private toResponse(purchaseOrder: PurchaseOrderWithRelations) {
    const latestSyncLog = purchaseOrder.erpSyncLogs[0] ?? null;

    return {
      ...purchaseOrder,
      erpSyncStatus: latestSyncLog?.status ?? null,
      latestErpSyncLog: latestSyncLog,
    };
  }

  private generatePoNumber() {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PO-${timestamp}-${random}`;
  }
}
