from pydantic import BaseModel
from typing import Literal

class AuditPrRequest(BaseModel):
    prId: str  # UUID of Purchase Request

class Finding(BaseModel):
    category: Literal["PRICE_ANOMALY", "BUDGET_WARNING", "SUPPLIER_RISK", "GENERAL"]
    severity: Literal["INFO", "WARNING", "CRITICAL"]
    message: str
    affectedItemSku: str | None = None

class BudgetImpact(BaseModel):
    remainingBefore: float
    remainingAfter: float
    usagePercentage: float  # 0-100

class Recommendation(BaseModel):
    action: Literal["APPROVE", "REJECT", "INVESTIGATE"]
    justification: str

class AuditPrResponse(BaseModel):
    riskScore: int  # 0-100
    riskLevel: Literal["LOW", "MEDIUM", "HIGH"]
    budgetImpact: BudgetImpact
    findings: list[Finding]
    recommendation: Recommendation
