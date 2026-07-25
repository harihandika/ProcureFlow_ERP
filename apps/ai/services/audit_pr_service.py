import json
import logging
import pathlib
from fastapi import HTTPException
from google import genai
from pydantic import ValidationError

from config import GEMINI_API_KEY
from db.connection import get_db
from db.queries import get_pr_with_items, get_budget_data
from schemas.audit_pr_schema import AuditPrResponse

# Initialize Gemini Client
GEMINI_CLIENT = None
if GEMINI_API_KEY and GEMINI_API_KEY != "your_api_key_here":
    GEMINI_CLIENT = genai.Client(api_key=GEMINI_API_KEY)
else:
    logging.warning("GEMINI_API_KEY is missing. AI features will not work.")

# Load prompt template once at module level to avoid file I/O on every request
prompt_path = pathlib.Path(__file__).parent.parent / "prompts" / "audit_pr_prompt.txt"
try:
    with open(prompt_path, "r", encoding="utf-8") as f:
        PROMPT_TEMPLATE = f.read()
except FileNotFoundError:
    logging.warning("Prompt template not found at module load. Ensure audit_pr_prompt.txt exists.")
    PROMPT_TEMPLATE = ""

def audit_pr(pr_id: str) -> dict:
    # 1. Fetch data from PostgreSQL
    with get_db() as conn:
        pr_data = get_pr_with_items(conn, pr_id)
        if not pr_data:
            raise HTTPException(status_code=404, detail="Purchase Request tidak ditemukan")
            
        budget_id = pr_data.get("budgetId")
        if budget_id:
            budget_data = get_budget_data(conn, budget_id)
            if not budget_data:
                budget_data = {"message": "Data budget tidak ditemukan"}
        else:
            budget_data = {"message": "Tidak ada budget terkait"}

    # 2. Prepare Prompt
    if not PROMPT_TEMPLATE:
        raise HTTPException(status_code=500, detail="Prompt template not loaded properly")

    prompt = PROMPT_TEMPLATE.replace(
        "{pr_data}", json.dumps(pr_data, default=str, ensure_ascii=False)
    ).replace(
        "{budget_data}", json.dumps(budget_data, default=str, ensure_ascii=False)
    )

    # 3. Call Gemini API
    if not GEMINI_CLIENT:
        raise HTTPException(status_code=503, detail="Layanan AI belum dikonfigurasi (API Key hilang).")

    try:
        response = GEMINI_CLIENT.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AuditPrResponse,
            }
        )
        
        # 4. Parse and Validate JSON
        if response.text:
            result = json.loads(response.text)
            # Use Pydantic to ensure the structure strictly matches before returning
            validated_result = AuditPrResponse(**result)
            return validated_result.model_dump()
        else:
            raise HTTPException(status_code=500, detail="Gemini me-return respons kosong.")
            
    except HTTPException:
        # Re-raise HTTPException agar tidak tertangkap block Exception di bawah
        raise
    except ValidationError as ve:
        logging.exception("Validation error on Gemini response:")
        raise HTTPException(status_code=500, detail="Struktur data dari AI tidak sesuai.")
    except Exception as e:
        logging.exception("Error calling Gemini API:")
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            raise HTTPException(status_code=429, detail="Kuota AI harian tercapai. Silakan coba lagi besok.")
        else:
            raise HTTPException(status_code=503, detail=f"Layanan AI sedang tidak tersedia: {str(e)}")
