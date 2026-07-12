# Step-by-Step Prompt Guide
# Membangun ProcureFlow AI Engine — Phase 1: Smart PR Risk Audit

**Tujuan dokumen ini:** Memberikan prompt yang sudah dioptimalkan agar Anda tinggal copy-paste ke AI assistant (Claude/Gemini). Setiap prompt dirancang agar AI tidak perlu membaca ulang seluruh codebase — cukup fokus pada file yang relevan.

> **Tips Hemat Token:**
> - Jalankan prompt **secara berurutan** (Step 1 → 2 → 3 → dst).
> - Jangan skip step. Setiap step menghasilkan file yang dibutuhkan step berikutnya.
> - Jika AI bertanya, jawab singkat. Jangan beri konteks yang sudah ada di prompt.

---

## Step 1: Setup Project Python FastAPI

**Tujuan:** Membuat folder `apps/ai/` dengan semua file dasar.

```
Buatkan project Python FastAPI di folder `apps/ai/` dalam monorepo saya. 
Ini adalah AI microservice yang akan berjalan di port 8000.

Buat file-file berikut:

1. `apps/ai/requirements.txt` — berisi:
   fastapi==0.115.0, uvicorn==0.32.0, google-genai==1.0.0, 
   psycopg2-binary==2.9.10, python-dotenv==1.0.1, pydantic==2.9.0

2. `apps/ai/.env` — berisi:
   GEMINI_API_KEY=your_api_key_here
   DATABASE_URL=postgresql://postgres:winner1234@localhost:5432/procureflow_erp
   PORT=8000

3. `apps/ai/config.py` — load environment variables menggunakan python-dotenv.
   Export: GEMINI_API_KEY, DATABASE_URL, PORT

4. `apps/ai/main.py` — entry point FastAPI dengan:
   - CORS middleware (allow origin http://localhost:3001)
   - Health check endpoint GET /health
   - Include router dari routers/audit_pr.py (buat placeholder dulu)
   - Jalankan dengan uvicorn

Jangan buat file lain selain yang disebutkan di atas.
```

---

## Step 2: Koneksi Database PostgreSQL

**Tujuan:** Python bisa query langsung ke database yang sama dengan NestJS.

```
Buat koneksi database PostgreSQL untuk Python FastAPI di `apps/ai/`.
Database URL sudah ada di `apps/ai/.env` → DATABASE_URL.

Buat 2 file:

1. `apps/ai/db/connection.py`:
   - Gunakan psycopg2 untuk membuat connection pool.
   - Buat fungsi `get_connection()` yang return connection dari pool.
   - Buat fungsi `close_pool()` untuk cleanup.

2. `apps/ai/db/queries.py`:
   - Buat fungsi `get_pr_with_items(pr_id: str) -> dict` yang menjalankan query:
     SELECT pr.id, pr."requestNumber", pr.title, pr.description, 
            pr.status, pr.priority, pr."totalAmount", pr.currency,
            pr."departmentId", pr."budgetId"
     FROM "PurchaseRequest" pr WHERE pr.id = pr_id
     
     Lalu ambil items-nya:
     SELECT pri."itemSkuSnapshot", pri."itemNameSnapshot", 
            pri.quantity, pri."estimatedUnitPrice", pri."lineTotal",
            pri."unitNameSnapshot",
            i."estimatedUnitPrice" as "masterPrice"
     FROM "PurchaseRequestItem" pri
     JOIN "Item" i ON pri."itemId" = i.id
     WHERE pri."purchaseRequestId" = pr_id
   
   - Buat fungsi `get_budget_data(budget_id: str) -> dict` yang menjalankan:
     SELECT id, code, name, "allocatedAmount", "reservedAmount",
            "committedAmount", "consumedAmount"
     FROM "Budget" WHERE id = budget_id
     
     Hitung juga remainingAmount = allocated - reserved - committed - consumed

Return semua data sebagai Python dict. Gunakan Decimal untuk angka keuangan.
```

---

## Step 3: Buat Pydantic Schemas (Input/Output Validation)

**Tujuan:** Mendefinisikan kontrak data yang ketat untuk request dan response.

```
Buat file `apps/ai/schemas/audit_pr_schema.py` berisi Pydantic models:

1. `AuditPrRequest`:
   - prId: str (UUID)

2. `Finding`:
   - category: Literal["PRICE_ANOMALY", "BUDGET_WARNING", "SUPPLIER_RISK", "GENERAL"]
   - severity: Literal["INFO", "WARNING", "CRITICAL"]
   - message: str
   - affectedItemSku: Optional[str] = None

3. `BudgetImpact`:
   - remainingBefore: float
   - remainingAfter: float
   - usagePercentage: float

4. `Recommendation`:
   - action: Literal["APPROVE", "REJECT", "INVESTIGATE"]
   - justification: str

5. `AuditPrResponse`:
   - riskScore: int (0-100)
   - riskLevel: Literal["LOW", "MEDIUM", "HIGH"]
   - budgetImpact: BudgetImpact
   - findings: List[Finding]
   - recommendation: Recommendation

Gunakan Pydantic v2 syntax (BaseModel dari pydantic).
```

---

## Step 4: Buat Prompt Template untuk Gemini

**Tujuan:** Membuat template prompt yang efisien (hemat token) dan menghasilkan output JSON terstruktur.

```
Buat file `apps/ai/prompts/audit_pr_prompt.txt` berisi template prompt 
untuk Google Gemini yang akan menganalisis Purchase Request.

Prompt harus:
1. Memberikan ROLE sebagai "Procurement Risk Auditor" 
2. Menerima data PR (title, items, harga, budget) sebagai context
3. Instruksi untuk membandingkan harga item di PR dengan harga master item
4. Instruksi untuk menghitung dampak terhadap sisa budget departemen
5. Instruksi untuk menentukan riskScore (0-100), riskLevel, findings, dan recommendation
6. WAJIB output dalam format JSON sesuai schema AuditPrResponse

Template menggunakan placeholder {pr_data} dan {budget_data} yang akan di-replace 
oleh Python saat runtime.

Buat prompt sesingkat mungkin (hemat token) tapi tetap jelas dan menghasilkan output akurat.
Tulis dalam Bahasa Indonesia.
```

---

## Step 5: Buat Service Logic (Gemini API Call)

**Tujuan:** Menghubungkan query database + prompt template + Gemini API.

```
Buat file `apps/ai/services/audit_pr_service.py` yang berisi:

1. Fungsi `async audit_pr(pr_id: str) -> AuditPrResponse`:
   a. Panggil `get_pr_with_items(pr_id)` dari db/queries.py
   b. Jika PR tidak ditemukan, raise HTTPException 404
   c. Panggil `get_budget_data(budget_id)` dari db/queries.py
   d. Baca template prompt dari `prompts/audit_pr_prompt.txt`
   e. Replace placeholder {pr_data} dan {budget_data} dengan data JSON
   f. Panggil Google Gemini API menggunakan library `google-genai`:
      - Model: "gemini-1.5-flash"
      - Set response_mime_type ke "application/json"
      - Set response_schema ke schema AuditPrResponse
   g. Parse response JSON dari Gemini
   h. Return sebagai AuditPrResponse Pydantic model

Import GEMINI_API_KEY dari config.py.
Gunakan `from google import genai` untuk SDK.
Handle error: jika Gemini return 429, raise HTTPException 429 dengan pesan ramah.
```

---

## Step 6: Buat Router/Endpoint FastAPI

**Tujuan:** Membuat endpoint REST yang bisa dipanggil oleh NestJS.

```
Buat file `apps/ai/routers/audit_pr.py` berisi:

1. FastAPI APIRouter dengan prefix "/ai"
2. Endpoint: POST /ai/audit-pr
   - Request body: AuditPrRequest (dari schemas)
   - Response model: AuditPrResponse
   - Panggil audit_pr_service.audit_pr(request.prId)
   - Return hasilnya

Pastikan endpoint sudah di-include di main.py.
```

---

## Step 7: NestJS Proxy Bridge

**Tujuan:** Menambahkan modul di NestJS yang mem-forward request AI ke Python.

```
Baca file `apps/api/src/app.module.ts` untuk melihat struktur modul yang sudah ada.

Buat 3 file baru di `apps/api/src/ai/`:

1. `ai-proxy.service.ts`:
   - Inject HttpService dari @nestjs/axios
   - Baca PYTHON_AI_SERVICE_URL dari ConfigService
   - Method: `async auditPr(prId: string)` → POST ke Python /ai/audit-pr
   - Handle error: jika Python service down, throw 503 ServiceUnavailableException

2. `ai.controller.ts`:
   - Route prefix: 'ai'
   - POST 'audit-pr/:id' → panggil aiProxyService.auditPr(id)
   - Gunakan decorator @Roles('MANAGER', 'FINANCE', 'ADMIN')
   - Perlu install package @nestjs/axios jika belum ada

3. `ai.module.ts`:
   - Import HttpModule dari @nestjs/axios
   - Register AiController dan AiProxyService

Lalu modifikasi `app.module.ts`:
   - Tambahkan AiModule ke array imports

Tambahkan di `apps/api/.env`:
   PYTHON_AI_SERVICE_URL=http://localhost:8000
```

---

## Step 8: Frontend — Tombol & Modal UI

**Tujuan:** Menambahkan tombol "Analisis AI" dan modal hasil audit di halaman approvals.

```
Baca file halaman approvals di `apps/web/src/app/approvals/` 
untuk memahami struktur komponen yang sudah ada.

Buat 2 file baru:

1. `apps/web/src/lib/api/ai.ts`:
   - Fungsi `auditPr(prId: string)` yang melakukan POST ke /api/ai/audit-pr/:prId
   - Gunakan axios instance yang sudah ada di project

2. `apps/web/src/components/ai/AiAuditModal.tsx`:
   - Props: isOpen, onClose, prId
   - Saat modal dibuka, panggil auditPr(prId) menggunakan TanStack Query
   - Tampilkan loading spinner saat memproses
   - Tampilkan hasil:
     - Badge risiko berwarna (hijau/kuning/merah) berdasarkan riskLevel
     - riskScore sebagai angka besar
     - Daftar findings sebagai card dengan icon severity
     - budgetImpact sebagai progress bar
     - recommendation.action sebagai badge + justification sebagai teks
   - Tombol "Tutup" untuk menutup modal
   - Gunakan Tailwind CSS untuk styling
   - Gunakan komponen Radix UI Dialog yang sudah ada di project

Lalu modifikasi halaman approvals:
   - Tambahkan tombol "✨ Analisis AI" di setiap baris PR
   - Saat diklik, buka AiAuditModal dengan prId yang sesuai
```

---

## Step 9: Testing & Verifikasi

**Tujuan:** Memastikan semua komponen terhubung dan berfungsi.

```
Bantu saya menguji integrasi AI. Jalankan langkah-langkah berikut:

1. Di terminal pertama: `cd apps/ai && pip install -r requirements.txt && python main.py`
2. Test endpoint Python: curl -X POST http://localhost:8000/ai/audit-pr -H "Content-Type: application/json" -d '{"prId":"<ID_PR_DARI_DATABASE>"}'
3. Test endpoint NestJS bridge: pastikan POST /api/ai/audit-pr/:id juga berfungsi
4. Buka browser http://localhost:3000/approvals dan klik tombol "Analisis AI"

Jika ada error, debug dan perbaiki.
```

---

## Step 10: Error Handling & Polish

**Tujuan:** Menambahkan penanganan error yang baik.

```
Review semua file AI yang sudah dibuat dan tambahkan:

1. Di Python (`apps/ai/`):
   - Logging menggunakan Python logging module
   - Retry logic jika Gemini API return 429 (tunggu 2 detik lalu coba lagi, max 2 retry)
   - Timeout 30 detik untuk Gemini API call

2. Di NestJS (`apps/api/src/ai/`):
   - Timeout 35 detik untuk HTTP call ke Python (lebih lama dari Python timeout)
   - Pesan error yang user-friendly dalam Bahasa Indonesia

3. Di Frontend (`apps/web/`):
   - Toast notification (menggunakan Sonner yang sudah ada) untuk error
   - Disable tombol "Analisis AI" saat sedang loading
   - Pesan fallback jika service AI tidak tersedia

Jangan ubah file lain selain yang disebutkan.
```

---

## Tips Penggunaan Prompt Guide Ini

1. **Satu step = satu prompt.** Jangan gabungkan beberapa step dalam satu prompt.
2. **Tunggu selesai** sebelum lanjut ke step berikutnya.
3. **Jika error**, copy error message dan paste ke prompt baru: `"Fix error berikut di file [nama_file]: [error message]"`
4. **Jangan beri konteks tambahan** yang sudah tertulis di prompt. AI akan membaca file yang disebutkan.
5. **Step 1-6** bisa dikerjakan oleh model murah (Gemini Flash / Claude Haiku).
6. **Step 7-8** sebaiknya gunakan model yang lebih pintar (Gemini Pro / Claude Sonnet) karena perlu memahami kode NestJS dan Next.js yang sudah ada.
