import { BudgetStatus, BudgetTransactionStatus, BudgetTransactionType, Prisma } from '@prisma/client';
import { BudgetsService } from '../budgets.service';

describe('BudgetsService', () => {
  const tx = {
    budget: {
      create: jest.fn(),
      update: jest.fn(),
    },
    budgetTransaction: {
      create: jest.fn(),
    },
  };

  const prisma = {
    department: {
      findFirst: jest.fn(),
    },
    budget: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    budgetTransaction: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const baseBudget = {
    id: 'budget-id',
    code: 'BGT-IT-2026',
    name: 'IT Department Budget 2026',
    fiscalYear: 2026,
    period: 'FY',
    currency: 'IDR',
    status: BudgetStatus.ACTIVE,
    description: null,
    allocatedAmount: new Prisma.Decimal(500000000),
    reservedAmount: new Prisma.Decimal(0),
    committedAmount: new Prisma.Decimal(0),
    consumedAmount: new Prisma.Decimal(0),
    departmentId: 'department-id',
    createdById: 'finance-id',
    approvedById: null,
    approvedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    department: { id: 'department-id', code: 'IT', name: 'Information Technology' },
    createdBy: { id: 'finance-id', email: 'finance@procureflow.test', fullName: 'Faris Finance' },
    approvedBy: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation((callback: (txClient: typeof tx) => unknown) => callback(tx));
  });

  it('creates a budget with an initial allocation transaction', async () => {
    prisma.department.findFirst.mockResolvedValue({ id: 'department-id' });
    prisma.budget.findFirst.mockResolvedValue(null);
    tx.budget.create.mockResolvedValue(baseBudget);
    tx.budgetTransaction.create.mockResolvedValue({ id: 'transaction-id' });

    const service = new BudgetsService(prisma as never);
    const result = await service.create(
      {
        code: 'bgt-it-2026',
        name: 'IT Department Budget 2026',
        fiscalYear: 2026,
        period: 'fy',
        allocatedAmount: 500000000,
        departmentId: 'department-id',
      },
      'finance-id',
    );

    expect(tx.budget.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'BGT-IT-2026',
          period: 'FY',
          status: BudgetStatus.ACTIVE,
          currency: 'IDR',
          departmentId: 'department-id',
          createdById: 'finance-id',
        }),
      }),
    );
    expect(tx.budgetTransaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: BudgetTransactionType.ALLOCATION,
          status: BudgetTransactionStatus.POSTED,
          budgetId: 'budget-id',
          createdById: 'finance-id',
        }),
      }),
    );
    expect(result.availableAmount.toString()).toBe('500000000');
  });

  it('rejects duplicate department fiscal year and period budgets', async () => {
    prisma.department.findFirst.mockResolvedValue({ id: 'department-id' });
    prisma.budget.findFirst.mockResolvedValue({ id: 'existing-budget-id' });

    const service = new BudgetsService(prisma as never);

    await expect(
      service.create({
        code: 'BGT-IT-2026',
        name: 'IT Department Budget 2026',
        fiscalYear: 2026,
        period: 'FY',
        allocatedAmount: 1000000,
        departmentId: 'department-id',
      }),
    ).rejects.toThrow('Budget already exists for this department, fiscal year, and period.');
  });

  it('rejects zero adjustment amounts', async () => {
    const service = new BudgetsService(prisma as never);

    await expect(service.adjust('budget-id', { amount: 0 })).rejects.toThrow('Adjustment amount cannot be zero.');
  });

  it('rejects adjustments that make allocated amount lower than usage', async () => {
    prisma.budget.findFirst.mockResolvedValue({
      ...baseBudget,
      allocatedAmount: new Prisma.Decimal(100),
      reservedAmount: new Prisma.Decimal(90),
      committedAmount: new Prisma.Decimal(20),
      consumedAmount: new Prisma.Decimal(0),
    });

    const service = new BudgetsService(prisma as never);

    await expect(service.adjust('budget-id', { amount: -1 })).rejects.toThrow(
      'Allocated amount cannot be lower than reserved, committed, and consumed amount.',
    );
  });
});
