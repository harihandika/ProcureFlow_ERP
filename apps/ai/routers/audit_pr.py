import secrets
from fastapi import APIRouter, Depends, Header, HTTPException
from config import AI_SERVICE_API_KEY
from schemas.audit_pr_schema import AuditPrRequest, AuditPrResponse
from services.audit_pr_service import audit_pr

router = APIRouter(prefix="/ai", tags=["AI"])

def require_service_key(x_ai_service_key: str | None = Header(default=None)):
    if not AI_SERVICE_API_KEY:
        raise HTTPException(status_code=503, detail="AI service authentication is not configured")
    if not x_ai_service_key or not secrets.compare_digest(
        x_ai_service_key.encode("utf-8"), AI_SERVICE_API_KEY.encode("utf-8")
    ):
        raise HTTPException(status_code=401, detail="Invalid AI service credentials")

@router.post(
    "/audit-pr", 
    response_model=AuditPrResponse,
    dependencies=[Depends(require_service_key)],
    summary="Audit Purchase Request",
    description="Menganalisis risiko dari sebuah Purchase Request menggunakan AI (Google Gemini) berdasarkan data PR dan Budget."
)
def audit_purchase_request(request: AuditPrRequest):
    result = audit_pr(request.prId)
    return result
