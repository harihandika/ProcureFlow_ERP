import json
import pathlib
from fastapi import HTTPException
from google import genai
from pydantic import ValidationError

from config import GEMINI_API_KEY
from db.connection import get_db
from db.queries import get_pr_with_items, get_budget_data
from schemas.audit_pr_schema import AuditPrResponse

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
    prompt_path = pathlib.Path(__file__).parent.parent / "prompts" / "audit_pr_prompt.txt"
    try:
        with open(prompt_path, "r", encoding="utf-8") as f:
            prompt_template = f.read()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Prompt template not found")

    prompt = prompt_template.replace(
        "{pr_data}", json.dumps(pr_data, default=str, ensure_ascii=False)
    ).replace(
        "{budget_data}", json.dumps(budget_data, default=str, ensure_ascii=False)
    )

    # 3. Call Gemini API
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
        raise HTTPException(status_code=503, detail="Layanan AI belum dikonfigurasi (API Key hilang).")

    try:
        client = genai.Client(api_key=GEMINI_API_KEY)
        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=prompt,
            config={
                "response_mime_type": "application/json",
                "response_schema": AuditPrResponse,
            }
        )
        
        # 4. Parse and return JSON
        if response.text:
            result = json.loads(response.text)
            return result
        else:
            raise HTTPException(status_code=500, detail="Gemini me-return respons kosong.")
            
    except Exception as e:
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            raise HTTPException(status_code=429, detail="Kuota AI harian tercapai. Silakan coba lagi besok.")
        else:
            raise HTTPException(status_code=503, detail=f"Layanan AI sedang tidak tersedia: {str(e)}")
