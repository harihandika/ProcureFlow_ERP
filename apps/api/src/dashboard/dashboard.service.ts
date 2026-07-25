import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseRequestStatus, PurchaseOrderStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const currentYear = new Date().getFullYear();

    const [
      totalPrPending,
      totalPrApproved,
      totalPoIssued,
      totalPoReceived,
      budgets,
      recentPurchaseRequests
    ] = await Promise.all([
      this.prisma.purchaseRequest.count({ where: { status: PurchaseRequestStatus.SUBMITTED, deletedAt: null } }),
      this.prisma.purchaseRequest.count({ where: { status: PurchaseRequestStatus.APPROVED, deletedAt: null } }),
      this.prisma.purchaseOrder.count({ where: { status: PurchaseOrderStatus.ISSUED, deletedAt: null } }),
      this.prisma.purchaseOrder.count({ where: { status: { in: [PurchaseOrderStatus.RECEIVED, PurchaseOrderStatus.PARTIALLY_RECEIVED] }, deletedAt: null } }),
      this.prisma.budget.findMany({ where: { fiscalYear: currentYear, deletedAt: null } }),
      this.prisma.purchaseRequest.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null },
        include: { requester: { select: { fullName: true } } }
      })
    ]);

    let totalBudget = 0;
    let totalSpent = 0;
    
    for (const b of budgets) {
      totalBudget += Number(b.allocatedAmount);
      totalSpent += Number(b.consumedAmount);
    }

    return {
      totalPrPending,
      totalPrApproved,
      totalPoIssued,
      totalPoReceived,
      budget: {
        total: totalBudget,
        spent: totalSpent,
        remaining: totalBudget - totalSpent,
        usagePercentage: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0
      },
      recentPurchaseRequests
    };
  }
}
