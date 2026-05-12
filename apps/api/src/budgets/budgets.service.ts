import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BudgetStatus, BudgetTransactionStatus, BudgetTransactionType, Prisma } from '@prisma/client';
import { BudgetAdjustmentDto } from './dto/budget-adjustment.dto';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { BudgetTransactionQueryDto } from './dto/budget-transaction-query.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const budgetInclude = {
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  createdBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.BudgetInclude;

type BudgetWithRelations = Prisma.BudgetGetPayload<{ include: typeof budgetInclude }>;

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBudgetDto, actorId?: string) {
    await this.validateDepartment(dto.departmentId);
    await this.validateBudgetPeriodUniqueness(dto.departmentId, dto.fiscalYear, dto.period);

    const currency = this.normalizeCurrency(dto.currency);
    const allocatedAmount = new Prisma.Decimal(dto.allocatedAmount);

    const budget = await this.prisma.$transaction(async (tx) => {
      const createdBudget = await tx.budget.create({
        data: {
          code: dto.code.trim().toUpperCase(),
          name: dto.name.trim(),
          fiscalYear: dto.fiscalYear,
          period: this.normalizePeriod(dto.period),
          currency,
          status: dto.status ?? BudgetStatus.ACTIVE,
          description: dto.description,
          allocatedAmount,
          departmentId: dto.departmentId,
          createdById: actorId,
        },
        include: budgetInclude,
      });

      if (allocatedAmount.gt(0)) {
        await tx.budgetTransaction.create({
          data: {
            transactionNo: this.generateTransactionNo('BGT-ALLOC'),
            type: BudgetTransactionType.ALLOCATION,
            status: BudgetTransactionStatus.POSTED,
            amount: allocatedAmount,
            currency,
            description: 'Initial budget allocation',
            budgetId: createdBudget.id,
            createdById: actorId,
          },
        });
      }

      return createdBudget;
    });

    return this.toBudgetResponse(budget);
  }

  async findAll(query: BudgetQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.BudgetWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.fiscalYear ? { fiscalYear: query.fiscalYear } : {}),
      ...(query.period ? { period: query.period } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { department: { code: { contains: query.search, mode: 'insensitive' } } },
              { department: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [budgets, total] = await this.prisma.$transaction([
      this.prisma.budget.findMany({
        where,
        include: budgetInclude,
        skip,
        take,
        orderBy: [{ fiscalYear: 'desc' }, { code: 'asc' }],
      }),
      this.prisma.budget.count({ where }),
    ]);

    return toPaginatedResult(budgets.map((budget) => this.toBudgetResponse(budget)), total, page, limit);
  }

  async findOne(id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, deletedAt: null },
      include: budgetInclude,
    });

    if (!budget) {
      throw new NotFoundException('Budget not found.');
    }

    return this.toBudgetResponse(budget);
  }

  async update(id: string, dto: UpdateBudgetDto) {
    const currentBudget = await this.findBudgetOrThrow(id);
    const nextDepartmentId = dto.departmentId ?? currentBudget.departmentId;
    const nextFiscalYear = dto.fiscalYear ?? currentBudget.fiscalYear;
    const nextPeriod = dto.period !== undefined ? dto.period : currentBudget.period ?? undefined;

    if (dto.departmentId) {
      await this.validateDepartment(dto.departmentId);
    }

    if (
      nextDepartmentId !== currentBudget.departmentId ||
      nextFiscalYear !== currentBudget.fiscalYear ||
      this.normalizePeriod(nextPeriod) !== currentBudget.period
    ) {
      await this.validateBudgetPeriodUniqueness(nextDepartmentId, nextFiscalYear, nextPeriod, id);
    }

    this.validateStatusChange(currentBudget, dto.status);

    const updatedBudget = await this.prisma.budget.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.fiscalYear !== undefined ? { fiscalYear: dto.fiscalYear } : {}),
        ...(dto.period !== undefined ? { period: this.normalizePeriod(dto.period) } : {}),
        ...(dto.currency !== undefined ? { currency: this.normalizeCurrency(dto.currency) } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
      },
      include: budgetInclude,
    });

    return this.toBudgetResponse(updatedBudget);
  }

  async findTransactions(id: string, query: BudgetTransactionQueryDto) {
    await this.findBudgetOrThrow(id);

    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.BudgetTransactionWhereInput = {
      budgetId: id,
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? {
            OR: [
              { transactionNo: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.budgetTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.budgetTransaction.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async adjust(id: string, dto: BudgetAdjustmentDto, actorId?: string) {
    const amount = new Prisma.Decimal(dto.amount);

    if (amount.eq(0)) {
      throw new BadRequestException('Adjustment amount cannot be zero.');
    }

    const budget = await this.findBudgetOrThrow(id);

    if (budget.status === BudgetStatus.CLOSED || budget.status === BudgetStatus.CANCELLED) {
      throw new BadRequestException('Closed or cancelled budgets cannot be adjusted.');
    }

    const nextAllocatedAmount = budget.allocatedAmount.plus(amount);
    this.validateAllocatedAmountCoversUsage(budget, nextAllocatedAmount);

    const updatedBudget = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.budget.update({
        where: { id },
        data: { allocatedAmount: nextAllocatedAmount },
        include: budgetInclude,
      });

      await tx.budgetTransaction.create({
        data: {
          transactionNo: this.generateTransactionNo('BGT-ADJ'),
          type: BudgetTransactionType.ADJUSTMENT,
          status: BudgetTransactionStatus.POSTED,
          amount,
          currency: budget.currency,
          description: dto.description,
          budgetId: id,
          createdById: actorId,
        },
      });

      return updated;
    });

    return this.toBudgetResponse(updatedBudget);
  }

  private async findBudgetOrThrow(id: string) {
    const budget = await this.prisma.budget.findFirst({
      where: { id, deletedAt: null },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found.');
    }

    return budget;
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

  private async validateBudgetPeriodUniqueness(
    departmentId: string,
    fiscalYear: number,
    period?: string | null,
    excludeBudgetId?: string,
  ) {
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        departmentId,
        fiscalYear,
        period: this.normalizePeriod(period),
        deletedAt: null,
        ...(excludeBudgetId ? { id: { not: excludeBudgetId } } : {}),
      },
    });

    if (existingBudget) {
      throw new BadRequestException('Budget already exists for this department, fiscal year, and period.');
    }
  }

  private validateStatusChange(
    budget: {
      reservedAmount: Prisma.Decimal;
      committedAmount: Prisma.Decimal;
      consumedAmount: Prisma.Decimal;
    },
    nextStatus?: BudgetStatus,
  ) {
    if (nextStatus !== BudgetStatus.CANCELLED) {
      return;
    }

    const usedAmount = this.getUsedAmount(budget);
    if (usedAmount.gt(0)) {
      throw new BadRequestException('Budget with existing usage cannot be cancelled.');
    }
  }

  private validateAllocatedAmountCoversUsage(
    budget: {
      reservedAmount: Prisma.Decimal;
      committedAmount: Prisma.Decimal;
      consumedAmount: Prisma.Decimal;
    },
    allocatedAmount: Prisma.Decimal,
  ) {
    const usedAmount = this.getUsedAmount(budget);

    if (allocatedAmount.lt(usedAmount)) {
      throw new BadRequestException('Allocated amount cannot be lower than reserved, committed, and consumed amount.');
    }
  }

  private getUsedAmount(budget: {
    reservedAmount: Prisma.Decimal;
    committedAmount: Prisma.Decimal;
    consumedAmount: Prisma.Decimal;
  }) {
    return budget.reservedAmount.plus(budget.committedAmount).plus(budget.consumedAmount);
  }

  private getAvailableAmount(budget: {
    allocatedAmount: Prisma.Decimal;
    reservedAmount: Prisma.Decimal;
    committedAmount: Prisma.Decimal;
    consumedAmount: Prisma.Decimal;
  }) {
    return budget.allocatedAmount.minus(this.getUsedAmount(budget));
  }

  private toBudgetResponse(budget: BudgetWithRelations) {
    return {
      ...budget,
      availableAmount: this.getAvailableAmount(budget),
    };
  }

  private normalizeCurrency(currency?: string) {
    return (currency ?? 'IDR').trim().toUpperCase();
  }

  private normalizePeriod(period?: string | null) {
    const normalizedPeriod = period?.trim();
    return normalizedPeriod ? normalizedPeriod.toUpperCase() : null;
  }

  private generateTransactionNo(prefix: string) {
    const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
    const random = Math.random().toString(36).slice(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }
}
