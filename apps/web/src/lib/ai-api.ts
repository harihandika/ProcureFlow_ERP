import { apiClient } from './api-client';

export type FindingCategory = 'PRICE_ANOMALY' | 'BUDGET_WARNING' | 'SUPPLIER_RISK' | 'GENERAL';
export type FindingSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type RecommendationAction = 'APPROVE' | 'REJECT' | 'INVESTIGATE';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Finding {
  category: FindingCategory;
  severity: FindingSeverity;
  message: string;
  affectedItemSku?: string;
}

export interface BudgetImpact {
  remainingBefore: number;
  remainingAfter: number;
  usagePercentage: number;
}

export interface Recommendation {
  action: RecommendationAction;
  justification: string;
}

export interface AuditPrResponse {
  riskScore: number;
  riskLevel: RiskLevel;
  budgetImpact: BudgetImpact;
  findings: Finding[];
  recommendation: Recommendation;
}

export async function auditPr(prId: string): Promise<AuditPrResponse> {
  const { data } = await apiClient.post<AuditPrResponse>(`/ai/audit-pr/${prId}`);
  return data;
}
