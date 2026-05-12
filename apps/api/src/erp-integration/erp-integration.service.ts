import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, ErpSyncOperation, ErpSyncStatus, Prisma, PurchaseOrderStatus } from '@prisma/client';
import { ErpSyncLogQueryDto } from './dto/erp-sync-log-query.dto';
import { SyncPurchaseOrderDto } from './dto/sync-purchase-order.dto';
import { AuditTrailsService } from '../audit-trails/audit-trails.service';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const erpSyncLogInclude = {
  purchaseOrder: {
    select: {
      id: true,
      poNumber: true,
      status: true,
      erpExternalId: true,
      syncedAt: true,
    },
  },
  triggeredBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.ErpSyncLogInclude;

@Injectable()
export class ErpIntegrationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailsService: AuditTrailsService,
  ) {}

  async syncPurchaseOrder(purchaseOrderId: string, dto: SyncPurchaseOrderDto, user: AuthenticatedUser) {
    this.validateSimulatedStatus(dto.simulateStatus);
    const purchaseOrder = await this.findSyncablePurchaseOrder(purchaseOrderId);
    const attemptNo = await this.getNextAttemptNo(purchaseOrderId, ErpSyncOperation.CREATE_PO);
    const mockResponse = this.simulateErpResponse(purchaseOrder.poNumber, dto.simulateStatus);

    const syncLog = await this.prisma.$transaction(async (tx) => {
      const createdLog = await tx.erpSyncLog.create({
        data: {
          operation: ErpSyncOperation.CREATE_PO,
          status: mockResponse.status,
          attemptNo,
          maxAttempts: 3,
          externalId: mockResponse.externalId,
          requestPayload: this.buildPurchaseOrderPayload(purchaseOrder),
          responsePayload: mockResponse.responsePayload,
          errorMessage: mockResponse.errorMessage,
          syncedAt: mockResponse.status === ErpSyncStatus.SUCCESS ? new Date() : undefined,
          nextRetryAt: mockResponse.status === ErpSyncStatus.FAILED ? this.getNextRetryAt(attemptNo) : undefined,
          purchaseOrderId,
          triggeredById: user.id,
        },
        include: erpSyncLogInclude,
      });

      if (mockResponse.status === ErpSyncStatus.SUCCESS) {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: {
            status: PurchaseOrderStatus.ISSUED,
            erpExternalId: mockResponse.externalId,
            syncedAt: new Date(),
          },
        });
      }

      return createdLog;
    });

    await this.auditTrailsService.record({
      action: AuditAction.SYNC_ERP,
      entityType: AuditEntityType.PURCHASE_ORDER,
      entityId: purchaseOrder.id,
      entityLabel: purchaseOrder.poNumber,
      actorId: user.id,
      after: syncLog,
      metadata: {
        operation: ErpSyncOperation.CREATE_PO,
        status: syncLog.status,
        attemptNo: syncLog.attemptNo,
      },
    });

    return syncLog;
  }

  async retryFailedSync(syncLogId: string, dto: SyncPurchaseOrderDto, user: AuthenticatedUser) {
    this.validateSimulatedStatus(dto.simulateStatus);
    const failedLog = await this.prisma.erpSyncLog.findUnique({
      where: { id: syncLogId },
      include: erpSyncLogInclude,
    });

    if (!failedLog) {
      throw new NotFoundException('ERP sync log not found.');
    }

    if (failedLog.status !== ErpSyncStatus.FAILED) {
      throw new BadRequestException('Only failed ERP sync logs can be retried.');
    }

    if (failedLog.attemptNo >= failedLog.maxAttempts) {
      throw new BadRequestException('ERP sync log has reached the maximum retry attempts.');
    }

    const purchaseOrder = await this.findSyncablePurchaseOrder(failedLog.purchaseOrderId);
    const retryAttemptNo = failedLog.attemptNo + 1;
    const mockResponse = this.simulateErpResponse(purchaseOrder.poNumber, dto.simulateStatus);

    const retryLog = await this.prisma.$transaction(async (tx) => {
      await tx.erpSyncLog.update({
        where: { id: failedLog.id },
        data: { status: ErpSyncStatus.RETRYING },
      });

      const createdRetryLog = await tx.erpSyncLog.create({
        data: {
          operation: failedLog.operation,
          status: mockResponse.status,
          attemptNo: retryAttemptNo,
          maxAttempts: failedLog.maxAttempts,
          externalId: mockResponse.externalId,
          requestPayload: this.buildPurchaseOrderPayload(purchaseOrder),
          responsePayload: mockResponse.responsePayload,
          errorMessage: mockResponse.errorMessage,
          syncedAt: mockResponse.status === ErpSyncStatus.SUCCESS ? new Date() : undefined,
          nextRetryAt: mockResponse.status === ErpSyncStatus.FAILED ? this.getNextRetryAt(retryAttemptNo) : undefined,
          purchaseOrderId: purchaseOrder.id,
          triggeredById: user.id,
          previousSyncLogId: failedLog.id,
        },
        include: erpSyncLogInclude,
      });

      if (mockResponse.status === ErpSyncStatus.SUCCESS) {
        await tx.purchaseOrder.update({
          where: { id: purchaseOrder.id },
          data: {
            status: PurchaseOrderStatus.ISSUED,
            erpExternalId: mockResponse.externalId,
            syncedAt: new Date(),
          },
        });
      }

      return createdRetryLog;
    });

    await this.auditTrailsService.record({
      action: AuditAction.RETRY_ERP_SYNC,
      entityType: AuditEntityType.ERP_SYNC_LOG,
      entityId: retryLog.id,
      entityLabel: purchaseOrder.poNumber,
      actorId: user.id,
      after: retryLog,
      metadata: {
        previousSyncLogId: failedLog.id,
        status: retryLog.status,
        attemptNo: retryLog.attemptNo,
      },
    });

    return retryLog;
  }

  async findLogs(query: ErpSyncLogQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.ErpSyncLogWhereInput = {
      ...(query.operation ? { operation: query.operation } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.purchaseOrderId ? { purchaseOrderId: query.purchaseOrderId } : {}),
      ...(query.search
        ? {
            OR: [
              { externalId: { contains: query.search, mode: 'insensitive' } },
              { errorMessage: { contains: query.search, mode: 'insensitive' } },
              { purchaseOrder: { poNumber: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.erpSyncLog.findMany({
        where,
        include: erpSyncLogInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.erpSyncLog.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findLog(id: string) {
    const syncLog = await this.prisma.erpSyncLog.findUnique({
      where: { id },
      include: erpSyncLogInclude,
    });

    if (!syncLog) {
      throw new NotFoundException('ERP sync log not found.');
    }

    return syncLog;
  }

  private async findSyncablePurchaseOrder(id: string) {
    const purchaseOrder = await this.prisma.purchaseOrder.findFirst({
      where: { id, deletedAt: null },
      include: {
        supplier: { select: { code: true, name: true } },
        warehouse: { select: { code: true, name: true } },
        items: {
          include: {
            item: { select: { sku: true, name: true } },
          },
        },
      },
    });

    if (!purchaseOrder) {
      throw new NotFoundException('Purchase order not found.');
    }

    if (purchaseOrder.status === PurchaseOrderStatus.CANCELLED) {
      throw new BadRequestException('Cancelled purchase orders cannot be synced to ERP.');
    }

    if (!purchaseOrder.items.length) {
      throw new BadRequestException('Purchase order must have at least one item before ERP sync.');
    }

    return purchaseOrder;
  }

  private async getNextAttemptNo(purchaseOrderId: string, operation: ErpSyncOperation) {
    const aggregate = await this.prisma.erpSyncLog.aggregate({
      where: { purchaseOrderId, operation },
      _max: { attemptNo: true },
    });

    return (aggregate._max.attemptNo ?? 0) + 1;
  }

  private simulateErpResponse(poNumber: string, forcedStatus?: ErpSyncStatus) {
    const status = forcedStatus ?? (Math.random() >= 0.25 ? ErpSyncStatus.SUCCESS : ErpSyncStatus.FAILED);

    if (status === ErpSyncStatus.SUCCESS) {
      const externalId = `ERP-${poNumber}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      return {
        status,
        externalId,
        responsePayload: {
          status: 'accepted',
          externalId,
          message: 'Purchase order synced to mock ERP.',
        },
        errorMessage: undefined,
      };
    }

    return {
      status,
      externalId: undefined,
      responsePayload: {
        status: 'rejected',
        code: 'ERP_TEMPORARY_FAILURE',
        message: 'Mock ERP rejected the request. Retry is allowed.',
      },
      errorMessage: 'Mock ERP temporary failure.',
    };
  }

  private validateSimulatedStatus(status?: ErpSyncStatus) {
    if (!status) {
      return;
    }

    if (status !== ErpSyncStatus.SUCCESS && status !== ErpSyncStatus.FAILED) {
      throw new BadRequestException('simulateStatus must be SUCCESS or FAILED.');
    }
  }

  private buildPurchaseOrderPayload(purchaseOrder: Prisma.PurchaseOrderGetPayload<{
    include: {
      supplier: { select: { code: true; name: true } };
      warehouse: { select: { code: true; name: true } };
      items: { include: { item: { select: { sku: true; name: true } } } };
    };
  }>) {
    return {
      poNumber: purchaseOrder.poNumber,
      currency: purchaseOrder.currency,
      totalAmount: purchaseOrder.totalAmount,
      supplier: purchaseOrder.supplier,
      warehouse: purchaseOrder.warehouse,
      items: purchaseOrder.items.map((item) => ({
        sku: item.itemSkuSnapshot,
        name: item.itemNameSnapshot,
        quantityOrdered: item.quantityOrdered,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
      })),
    };
  }

  private getNextRetryAt(attemptNo: number) {
    const retryAt = new Date();
    retryAt.setMinutes(retryAt.getMinutes() + attemptNo * 5);
    return retryAt;
  }
}
