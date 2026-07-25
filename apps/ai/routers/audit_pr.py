from fastapi import APIRouter
from schemas.audit_pr_schema import AuditPrRequest, AuditPrResponse
from services.audit_pr_service import audit_pr

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post(
    "/audit-pr", 
    response_model=AuditPrResponse,
    summary="Audit Purchase Request",
    description="Menganalisis risiko dari sebuah Purchase Request menggunakan AI (Google Gemini) berdasarkan data PR dan Budget."
)
def audit_purchase_request(request: AuditPrRequest):
    result = audit_pr(request.prId)
    return result
