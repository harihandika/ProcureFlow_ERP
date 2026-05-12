import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  BudgetStatus,
  BudgetTransactionStatus,
  BudgetTransactionType,
  Prisma,
  PurchaseRequestStatus,
} from '@prisma/client';
import { AddPurchaseRequestItemsDto } from './dto/add-purchase-request-items.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { PurchaseRequestItemInputDto } from './dto/purchase-request-item-input.dto';
import { PurchaseRequestQueryDto } from './dto/purchase-request-query.dto';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const purchaseRequestInclude = {
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
      status: true,
      allocatedAmount: true,
      reservedAmount: true,
      committedAmount: true,
      consumedAmount: true,
      currency: true,
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
} satisfies Prisma.PurchaseRequestInclude;

type PurchaseRequestWithRelations = Prisma.PurchaseRequestGetPayload<{ include: typeof purchaseRequestInclude }>;

@Injectable()
export class PurchaseRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraft(dto: CreatePurchaseRequestDto, user: AuthenticatedUser) {
    const departmentId = dto.departmentId ?? user.departmentId;
    if (!departmentId) {
      throw new BadRequestException('Requester must belong to a department or provide a departmentId.');
    }

    await this.validateDepartment(departmentId);
    const budget = dto.budgetId ? await this.validateBudget(dto.budgetId, departmentId) : undefined;
    const preparedItems = await this.prepareItems(dto.items ?? []);
    const totalAmount = this.sumLineTotals(preparedItems);

    const purchaseRequest = await this.prisma.purchaseRequest.create({
      data: {
        requestNumber: this.generateRequestNumber(),
        title: dto.title.trim(),
        description: dto.description,
        priority: dto.priority,
        requiredDate: dto.requiredDate ? new Date(dto.requiredDate) : undefined,
        status: PurchaseRequestStatus.DRAFT,
        requesterId: user.id,
        departmentId,
        budgetId: dto.budgetId,
        totalAmount,
        currency: budget?.currency ?? 'IDR',
        items: preparedItems.length
          ? {
              create: preparedItems.map((preparedItem) => preparedItem.data),
            }
          : undefined,
      },
      include: purchaseRequestInclude,
    });

    return purchaseRequest;
  }

  async findAll(query: PurchaseRequestQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PurchaseRequestWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.requesterId ? { requesterId: query.requesterId } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.budgetId ? { budgetId: query.budgetId } : {}),
      ...(query.search
        ? {
            OR: [
              { requestNumber: { contains: query.search, mode: 'insensitive' } },
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { requester: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { department: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.purchaseRequest.findMany({
        where,
        include: purchaseRequestInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.purchaseRequest.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    return this.findPurchaseRequestOrThrow(id);
  }

  async addItems(id: string, dto: AddPurchaseRequestItemsDto, user: AuthenticatedUser) {
    const purchaseRequest = await this.findPurchaseRequestOrThrow(id);
    this.ensureRequesterCanMutate(purchaseRequest, user);
    this.ensureDraft(purchaseRequest.status);

    const preparedItems = await this.prepareItems(dto.items);
    const addedAmount = this.sumLineTotals(preparedItems);

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseRequestItem.createMany({
        data: preparedItems.map((preparedItem) => ({
          purchaseRequestId: id,
          ...preparedItem.data,
        })),
      });

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          totalAmount: purchaseRequest.totalAmount.plus(addedAmount),
        },
        include: purchaseRequestInclude,
      });
    });
  }

  async submit(id: string, dto: SubmitPurchaseRequestDto, user: AuthenticatedUser) {
    const purchaseRequest = await this.findPurchaseRequestOrThrow(id);
    this.ensureRequesterCanMutate(purchaseRequest, user);
    this.ensureDraft(purchaseRequest.status);

    if (!purchaseRequest.items.length) {
      throw new BadRequestException('Purchase request must have at least one item before submission.');
    }

    const budgetId = dto.budgetId ?? purchaseRequest.budgetId;
    if (!budgetId) {
      throw new BadRequestException('Budget is required before submitting a purchase request.');
    }

    const budget = await this.validateBudget(budgetId, purchaseRequest.departmentId);
    const availableAmount = this.getAvailableBudgetAmount(budget);

    if (purchaseRequest.totalAmount.gt(availableAmount)) {
      throw new BadRequestException('Purchase request total exceeds available budget.');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.budget.update({
        where: { id: budget.id },
        data: {
          reservedAmount: budget.reservedAmount.plus(purchaseRequest.totalAmount),
        },
      });

      await tx.budgetTransaction.create({
        data: {
          transactionNo: this.generateTransactionNo('BGT-RES'),
          type: BudgetTransactionType.RESERVATION,
          status: BudgetTransactionStatus.POSTED,
          amount: purchaseRequest.totalAmount,
          currency: budget.currency,
          description: `Reserved for purchase request ${purchaseRequest.requestNumber}`,
          budgetId: budget.id,
          purchaseRequestId: purchaseRequest.id,
          createdById: user.id,
        },
      });

      return tx.purchaseRequest.update({
        where: { id },
        data: {
          status: PurchaseRequestStatus.SUBMITTED,
          submittedAt: new Date(),
          budgetId: budget.id,
          currency: budget.currency,
        },
        include: purchaseRequestInclude,
      });
    });
  }

  private async findPurchaseRequestOrThrow(id: string) {
    const purchaseRequest = await this.prisma.purchaseRequest.findFirst({
      where: { id, deletedAt: null },
      include: purchaseRequestInclude,
    });

    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request not found.');
    }

    return purchaseRequest;
  }

  private ensureRequesterCanMutate(purchaseRequest: PurchaseRequestWithRelations, user: AuthenticatedUser) {
    if (purchaseRequest.requesterId !== user.id && !user.roles.includes('ADMIN')) {
      throw new ForbiddenException('Only the requester or Admin can change this purchase request.');
    }
  }

  private ensureDraft(status: PurchaseRequestStatus) {
    if (status !== PurchaseRequestStatus.DRAFT) {
      throw new BadRequestException('Only draft purchase requests can be changed.');
    }
  }

  private async validateDepartment(departmentId: string) {
    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!department) {
      throw new BadRequestException('Department does not exist or is inactive.');
    }
  }

  private async validateBudget(budgetId: string, departmentId: string) {
    const budget = await this.prisma.budget.findFirst({
      where: {
        id: budgetId,
        deletedAt: null,
        status: BudgetStatus.ACTIVE,
      },
    });

    if (!budget) {
      throw new BadRequestException('Budget does not exist or is not active.');
    }

    if (budget.departmentId !== departmentId) {
      throw new BadRequestException('Budget must belong to the purchase request department.');
    }

    return budget;
  }

  private async prepareItems(items: PurchaseRequestItemInputDto[]) {
    return Promise.all(
      items.map(async (input) => {
        const [item, packagingUnit] = await Promise.all([
          this.prisma.item.findFirst({
            where: {
              id: input.itemId,
              deletedAt: null,
              isActive: true,
            },
          }),
          this.prisma.packagingUnit.findFirst({
            where: {
              id: input.packagingUnitId,
              deletedAt: null,
              isActive: true,
            },
          }),
        ]);

        if (!item) {
          throw new BadRequestException('One or more items do not exist or are inactive.');
        }

        if (!packagingUnit) {
          throw new BadRequestException('One or more packaging units do not exist or are inactive.');
        }

        const quantity = new Prisma.Decimal(input.quantity);
        const estimatedUnitPrice = new Prisma.Decimal(input.estimatedUnitPrice);
        const lineTotal = quantity.mul(estimatedUnitPrice);

        return {
          lineTotal,
          data: {
            itemId: item.id,
            packagingUnitId: packagingUnit.id,
            description: input.description,
            notes: input.notes,
            quantity,
            estimatedUnitPrice,
            lineTotal,
            itemSkuSnapshot: item.sku,
            itemNameSnapshot: item.name,
            unitCodeSnapshot: packagingUnit.code,
            unitNameSnapshot: packagingUnit.name,
          },
        };
      }),
    );
  }

  private sumLineTotals(items: Array<{ lineTotal: Prisma.Decimal }>) {
    return items.reduce((total, item) => total.plus(item.lineTotal), new Prisma.Decimal(0));
  }

  private getAvailableBudgetAmount(budget: {
    allocatedAmount: Prisma.Decimal;
    reservedAmount: Prisma.Decimal;
    committedAmount: Prisma.Decimal;
    consumedAmount: Prisma.Decimal;
  }) {
    return budget.allocatedAmount.minus(budget.reservedAmount).minus(budget.committedAmount).minus(budget.consumedAmount);
  }

  private generateRequestNumber() {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `PR-${timestamp}-${random}`;
  }

  private generateTransactionNo(prefix: string) {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
