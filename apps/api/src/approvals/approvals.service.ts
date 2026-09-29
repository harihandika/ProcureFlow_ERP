import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApprovalDecision, AuditAction, AuditEntityType, BudgetTransactionStatus, BudgetTransactionType, Prisma, PurchaseRequestStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { serializableTransaction } from '../common/utils/serializable-transaction.util';
import { RejectApprovalDto } from './dto/reject-approval.dto';
import { AuditTrailsService } from '../audit-trails/audit-trails.service';
import { AppRole } from '../common/constants/roles';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../prisma/prisma.service';

const approvalPurchaseRequestInclude = {
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

const auditTrailInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.AuditTrailInclude;

type ApprovalPurchaseRequest = Prisma.PurchaseRequestGetPayload<{ include: typeof approvalPurchaseRequestInclude }>;
const emptyUuid = '00000000-0000-0000-0000-000000000000';
type ApprovalRecord = Prisma.ApprovalGetPayload<{
  include: {
    approver: {
      select: { id: true; email: true; fullName: true };
    };
  };
}>;

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditTrailsService: AuditTrailsService,
  ) {}

  async findMyQueue(user: AuthenticatedUser) {
    const where: Prisma.PurchaseRequestWhereInput = {
      deletedAt: null,
      status: {
        in: [PurchaseRequestStatus.SUBMITTED, PurchaseRequestStatus.APPROVED, PurchaseRequestStatus.REJECTED],
      },
      ...this.getDepartmentScope(user),
    };

    const purchaseRequests = await this.prisma.purchaseRequest.findMany({
      where,
      include: approvalPurchaseRequestInclude,
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    const approvals = await this.findApprovals(purchaseRequests.map((request) => request.id));

    return purchaseRequests.map((purchaseRequest) =>
      this.toApprovalQueueItem(purchaseRequest, this.getApprovalsForEntity(approvals, purchaseRequest.id), user),
    );
  }

  async approve(id: string, user: AuthenticatedUser) {
    return this.decide(id, user, ApprovalDecision.APPROVED);
  }

  async reject(id: string, dto: RejectApprovalDto, user: AuthenticatedUser) {
    return this.decide(id, user, ApprovalDecision.REJECTED, dto.reason.trim());
  }

  private async decide(id: string, user: AuthenticatedUser, decision: ApprovalDecision, reason?: string) {
    return serializableTransaction(this.prisma, async (tx) => {
      const purchaseRequest = await this.findSubmittedPurchaseRequest(id, tx);
      this.ensureCanActOnPurchaseRequest(purchaseRequest, user);

      if (decision === ApprovalDecision.REJECTED) {
        if (!purchaseRequest.budgetId || !purchaseRequest.budget) {
          throw new BadRequestException('Purchase request has no budget reservation to release.');
        }
        const entries = await tx.budgetTransaction.findMany({
          where: {
            purchaseRequestId: id, budgetId: purchaseRequest.budgetId,
            status: BudgetTransactionStatus.POSTED,
            type: { in: [BudgetTransactionType.RESERVATION, BudgetTransactionType.RELEASE] },
          },
        });
        const reservation = entries.reduce((amount, entry) =>
          entry.type === BudgetTransactionType.RESERVATION ? amount.plus(entry.amount) : amount.minus(entry.amount),
          new Prisma.Decimal(0));
        if (!reservation.eq(purchaseRequest.totalAmount) || purchaseRequest.budget.reservedAmount.lt(reservation)) {
          throw new BadRequestException('Budget reservation is inconsistent. Reconcile the reservation before rejecting.');
        }
        await tx.budget.update({
          where: { id: purchaseRequest.budgetId },
          data: { reservedAmount: { decrement: reservation } },
        });
        await tx.budgetTransaction.create({
          data: {
            transactionNo: `BGT-REL-${randomUUID()}`,
            type: BudgetTransactionType.RELEASE, status: BudgetTransactionStatus.POSTED,
            amount: reservation, currency: purchaseRequest.currency,
            budgetId: purchaseRequest.budgetId, purchaseRequestId: id, createdById: user.id,
            description: `Released for rejected purchase request ${purchaseRequest.requestNumber}`,
          },
        });
      }

      const updatedPurchaseRequest = await tx.purchaseRequest.update({
        where: { id: purchaseRequest.id },
        data: { status: decision === ApprovalDecision.APPROVED ? PurchaseRequestStatus.APPROVED : PurchaseRequestStatus.REJECTED },
        include: approvalPurchaseRequestInclude,
      });

      await this.recordDecision(updatedPurchaseRequest, user, decision, reason, tx);

      const approvals = await this.findApprovals([updatedPurchaseRequest.id], tx);
      return this.toApprovalQueueItem(updatedPurchaseRequest, approvals, user);
    });
  }

  private async findSubmittedPurchaseRequest(id: string, tx: Prisma.TransactionClient) {
    const purchaseRequest = await tx.purchaseRequest.findFirst({
      where: { id, deletedAt: null },
      include: approvalPurchaseRequestInclude,
    });

    if (!purchaseRequest) {
      throw new NotFoundException('Purchase request approval item not found.');
    }

    if (purchaseRequest.status !== PurchaseRequestStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted purchase requests can be approved or rejected.');
    }

    return purchaseRequest;
  }

  private ensureCanActOnPurchaseRequest(purchaseRequest: ApprovalPurchaseRequest, user: AuthenticatedUser) {
    if (!this.hasApprovalRole(user)) {
      throw new ForbiddenException('You are not allowed to review purchase requests.');
    }

    const departmentScope = this.getDepartmentScope(user);
    if (departmentScope.departmentId && purchaseRequest.departmentId !== departmentScope.departmentId) {
      throw new ForbiddenException('You can only review purchase requests from your department.');
    }
  }

  private hasApprovalRole(user: AuthenticatedUser) {
    return user.roles.some((role) => [AppRole.Admin, AppRole.Manager, AppRole.Finance].includes(role as AppRole));
  }

  private getDepartmentScope(user: AuthenticatedUser): Pick<Prisma.PurchaseRequestWhereInput, 'departmentId'> {
    if (user.roles.includes(AppRole.Admin) || user.roles.includes(AppRole.Finance)) {
      return {};
    }

    if (user.roles.includes(AppRole.Manager)) {
      return { departmentId: user.departmentId ?? emptyUuid };
    }

    return { departmentId: emptyUuid };
  }

  private async recordDecision(
    purchaseRequest: ApprovalPurchaseRequest,
    user: AuthenticatedUser,
    decision: ApprovalDecision,
    reason?: string,
    tx: Prisma.TransactionClient = this.prisma,
  ) {
    await tx.approval.create({
      data: {
        purchaseRequestId: purchaseRequest.id,
        approverId: user.id,
        decision,
        reason: reason || null,
      },
    });

    await this.auditTrailsService.record({
      action: AuditAction.UPDATE,
      entityType: AuditEntityType.PURCHASE_REQUEST,
      entityId: purchaseRequest.id,
      entityLabel: purchaseRequest.requestNumber,
      actorId: user.id,
      before: { status: PurchaseRequestStatus.SUBMITTED },
      after: { status: decision },
      metadata: {
        approvalDecision: decision,
        reason,
      },
    }, tx);
  }

  private async findApprovals(entityIds: string[], tx: Prisma.TransactionClient = this.prisma) {
    if (!entityIds.length) {
      return [];
    }

    return tx.approval.findMany({
      where: {
        purchaseRequestId: { in: entityIds },
      },
      include: {
        approver: {
          select: { id: true, email: true, fullName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private getApprovalsForEntity(approvals: ApprovalRecord[], entityId: string) {
    return approvals.filter((approval) => approval.purchaseRequestId === entityId);
  }

  private toApprovalQueueItem(
    purchaseRequest: ApprovalPurchaseRequest,
    approvals: ApprovalRecord[],
    user: AuthenticatedUser,
  ) {
    const latestDecision = approvals.at(-1);

    return {
      id: purchaseRequest.id,
      status: purchaseRequest.status,
      canAct: purchaseRequest.status === PurchaseRequestStatus.SUBMITTED && this.canActOnPurchaseRequest(purchaseRequest, user),
      rejectReason: latestDecision?.reason ?? null,
      purchaseRequest,
      timeline: this.buildTimeline(purchaseRequest, approvals),
    };
  }

  private buildTimeline(purchaseRequest: ApprovalPurchaseRequest, approvals: ApprovalRecord[]) {
    const timeline = [
      {
        label: 'Submitted',
        actor: purchaseRequest.requester.fullName,
        status: purchaseRequest.submittedAt ? 'COMPLETED' : 'WAITING',
        date: purchaseRequest.submittedAt?.toISOString() ?? null,
        note: null,
      },
    ];

    const decisionSteps = approvals.map((approval) => {
      const decision = approval.decision;

      return {
        label: decision === 'REJECTED' ? 'Rejected' : 'Approved',
        actor: approval.approver?.fullName ?? 'Approver',
        status: decision === 'REJECTED' ? 'REJECTED' : 'COMPLETED',
        date: approval.createdAt.toISOString(),
        note: approval.reason ?? null,
      };
    });

    if (decisionSteps.length) {
      return [...timeline, ...decisionSteps];
    }

    return [
      ...timeline,
      {
        label: 'Approval Review',
        actor: 'Manager / Finance',
        status: 'PENDING',
        date: null,
        note: null,
      },
    ];
  }

  private canActOnPurchaseRequest(purchaseRequest: ApprovalPurchaseRequest, user: AuthenticatedUser) {
    if (!this.hasApprovalRole(user)) {
      return false;
    }

    const departmentScope = this.getDepartmentScope(user);
    return !departmentScope.departmentId || departmentScope.departmentId === purchaseRequest.departmentId;
  }
}
