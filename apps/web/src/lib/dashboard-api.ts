import { apiClient } from './api-client';

export interface DashboardSummary {
  totalPrPending: number;
  totalPrApproved: number;
  totalPoIssued: number;
  totalPoReceived: number;
  budget: {
    total: number;
    spent: number;
    remaining: number;
    usagePercentage: number;
  };
  recentPurchaseRequests: Array<{
    id: string;
    requestNumber: string;
    title: string;
    status: string;
    totalAmount: string;
    createdAt: string;
    requester: {
      fullName: string;
    };
  }>;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get('/dashboard/summary');
  return response.data;
}
