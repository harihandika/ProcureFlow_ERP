# Sprint 3: Prompt Template + Service Logic + Router Endpoint

## Tujuan
Membuat template prompt Gemini, logika service yang menghubungkan database + prompt + Gemini API, dan endpoint REST FastAPI.

## Prasyarat
- Sprint 1 dan 2 sudah selesai
- `apps/ai/db/queries.py` dan `apps/ai/schemas/audit_pr_schema.py` sudah ada

## File yang Harus Dibuat

### 1. `apps/ai/prompts/audit_pr_prompt.txt`

Buat template prompt untuk Gemini. Prompt harus SINGKAT (hemat token) tapi jelas.

```
Kamu adalah Procurement Risk Auditor untuk sistem ERP.

Analisis Purchase Request berikut dan berikan penilaian risiko.

## Data Purchase Request
{pr_data}

## Data Budget Departemen
{budget_data}

## Instruksi Analisis
1. Bandingkan harga setiap item di PR ("pricePerUnit") dengan harga referensi master ("masterPrice"). Jika selisih ≥20%, tandai sebagai PRICE_ANOMALY dengan severity CRITICAL. Jika selisih 10-19%, severity WARNING.
2. Hitung sisa budget setelah PR disetujui (remainingBefore - totalAmount PR). Jika sisa budget <25% dari alokasi, tandai sebagai BUDGET_WARNING.
3. Tentukan riskScore (0-100): 0=aman, 100=sangat berisiko. Faktor: anomali harga, dampak budget, prioritas PR.
4. Tentukan riskLevel: LOW (0-39), MEDIUM (40-69), HIGH (70-100).
5. Berikan rekomendasi: APPROVE jika risiko rendah, INVESTIGATE jika ada anomali, REJECT jika risiko sangat tinggi.

Berikan respons dalam Bahasa Indonesia.
```

Placeholder `{pr_data}` dan `{budget_data}` akan di-replace saat runtime dengan data JSON dari database.

### 2. `apps/ai/services/audit_pr_service.py`

Buat service dengan fungsi utama `audit_pr(pr_id: str) -> dict`:

Langkah-langkah:
1. Ambil koneksi dari pool menggunakan context manager `get_db()` dari `db/connection.py`
2. Panggil `get_pr_with_items(conn, pr_id)` — jika None, raise `HTTPException(404, "Purchase Request tidak ditemukan")`
3. Panggil `get_budget_data(conn, budget_id)` — jika budget_id tidak ada di PR, set budget_data sebagai `{"message": "Tidak ada budget terkait"}`
4. Baca template prompt dari file `prompts/audit_pr_prompt.txt` (gunakan path relatif dari file service)
5. Replace `{pr_data}` dengan `json.dumps(pr_data, default=str, ensure_ascii=False)`
6. Replace `{budget_data}` dengan `json.dumps(budget_data, default=str, ensure_ascii=False)`
7. Panggil Gemini API:

```python
from google import genai

client = genai.Client(api_key=GEMINI_API_KEY)

response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents=prompt,
    config={
        "response_mime_type": "application/json",
        "response_schema": AuditPrResponse,
    }
)
```

8. Parse `response.text` sebagai JSON dan return
9. Handle errors:
   - Jika Gemini return status 429: raise `HTTPException(429, "Kuota AI harian tercapai. Silakan coba lagi besok.")`
   - Jika error jaringan/timeout: raise `HTTPException(503, "Layanan AI sedang tidak tersedia. Coba lagi nanti.")`
   - Jika JSON parsing gagal: raise `HTTPException(500, "Gagal memproses respons AI.")`

PENTING: Import `GEMINI_API_KEY` dari `config.py`. Import `AuditPrResponse` dari `schemas/audit_pr_schema.py`. Gunakan `pathlib.Path` untuk membaca file prompt.

### 3. `apps/ai/routers/audit_pr.py`

Buat FastAPI router:

```python
from fastapi import APIRouter, HTTPException
from schemas.audit_pr_schema import AuditPrRequest, AuditPrResponse
from services.audit_pr_service import audit_pr

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/audit-pr", response_model=AuditPrResponse)
async def audit_purchase_request(request: AuditPrRequest):
    """Analisis risiko Purchase Request menggunakan AI."""
    result = await audit_pr(request.prId)
    return result
```

### 4. Update `apps/ai/main.py`

Modifikasi `main.py` yang sudah ada:
- Import router dari `routers/audit_pr.py`
- Include router: `app.include_router(router)`
- Hapus placeholder comment yang dibuat di Sprint 1

## Verifikasi

Setelah semua file dibuat:
1. Pastikan server Python masih bisa start tanpa error: `cd apps/ai && python main.py`
2. Buka `http://localhost:8000/docs` di browser — pastikan endpoint `POST /ai/audit-pr` muncul di Swagger UI
3. Jika user sudah memasukkan GEMINI_API_KEY yang valid, coba test dengan PR ID dari database

## Output Sprint

Laporkan semua file yang dibuat/dimodifikasi dan screenshot/hasil dari Swagger docs.
