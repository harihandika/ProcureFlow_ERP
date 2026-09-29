import { ApprovalDecision, BudgetTransactionType, Prisma, PurchaseRequestStatus } from '@prisma/client';
import { ApprovalsService } from './approvals.service';

describe('ApprovalsService decisions', () => {
  const user = { id: 'finance', email: 'f@test', fullName: 'Finance', departmentId: null, roles: ['FINANCE'] };
  const request = { id: 'pr', requestNumber: 'PR-1', status: PurchaseRequestStatus.SUBMITTED,
    budgetId: 'budget', departmentId: 'dept', totalAmount: new Prisma.Decimal(80), currency: 'IDR',
    budget: { reservedAmount: new Prisma.Decimal(80) }, requester: { fullName: 'Requester' }, submittedAt: new Date() };
  const tx = {
    purchaseRequest: { findFirst: jest.fn(), update: jest.fn() },
    budget: { update: jest.fn() },
    budgetTransaction: { findMany: jest.fn(), create: jest.fn() },
    approval: { create: jest.fn(), findMany: jest.fn() },
  };
  const prisma = { $transaction: jest.fn() };
  const audit = { record: jest.fn() };
  let service: ApprovalsService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.purchaseRequest.findFirst.mockResolvedValue(request);
    tx.purchaseRequest.update.mockImplementation(({ data }) => Promise.resolve({ ...request, ...data }));
    tx.budgetTransaction.findMany.mockResolvedValue([{ type: BudgetTransactionType.RESERVATION, amount: new Prisma.Decimal(80) }]);
    tx.approval.findMany.mockResolvedValue([]);
    service = new ApprovalsService(prisma as never, audit as never);
  });

  it('releases exactly the PR reservation and records decision/audit in the transaction', async () => {
    await service.reject('pr', { reason: 'Not needed' }, user);
    expect(tx.budget.update).toHaveBeenCalledWith({ where: { id: 'budget' }, data: { reservedAmount: { decrement: new Prisma.Decimal(80) } } });
    expect(tx.budgetTransaction.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ type: 'RELEASE', amount: new Prisma.Decimal(80), purchaseRequestId: 'pr' }) }));
    expect(tx.approval.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ decision: ApprovalDecision.REJECTED }) }));
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'pr' }), tx);
  });

  it('does not release the budget a second time', async () => {
    tx.purchaseRequest.findFirst.mockResolvedValue({ ...request, status: PurchaseRequestStatus.REJECTED });
    await expect(service.reject('pr', { reason: 'Again' }, user)).rejects.toThrow('Only submitted');
    expect(tx.budget.update).not.toHaveBeenCalled();
    expect(tx.approval.create).not.toHaveBeenCalled();
  });

  it('rejects inconsistent reservations before any write', async () => {
    tx.budgetTransaction.findMany.mockResolvedValue([]);
    await expect(service.reject('pr', { reason: 'No ledger' }, user)).rejects.toThrow('reservation is inconsistent');
    expect(tx.budget.update).not.toHaveBeenCalled();
    expect(tx.purchaseRequest.update).not.toHaveBeenCalled();
  });

  it('approves without releasing the reserved budget', async () => {
    await service.approve('pr', user);
    expect(tx.budget.update).not.toHaveBeenCalled();
    expect(tx.approval.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ decision: ApprovalDecision.APPROVED }) }));
  });

  it('denies managers from other departments', async () => {
    await expect(service.approve('pr', { ...user, departmentId: 'other', roles: ['MANAGER'] })).rejects.toThrow('your department');
    expect(tx.purchaseRequest.update).not.toHaveBeenCalled();
  });
});
