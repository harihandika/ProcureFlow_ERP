from fastapi import APIRouter
from schemas.audit_pr_schema import AuditPrRequest, AuditPrResponse
from services.audit_pr_service import audit_pr

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/audit-pr", response_model=AuditPrResponse)
def audit_purchase_request(request: AuditPrRequest):
    """Analisis risiko Purchase Request menggunakan AI (Gemini)."""
    result = audit_pr(request.prId)
    return result
