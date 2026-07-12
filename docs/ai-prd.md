# Product Requirements Document (PRD)
# ProcureFlow AI Engine — Phase 1: Smart PR Risk Audit

**Version:** 1.0 | **Tanggal:** Juli 2026 | **Status:** Approved

---

## 1. Ringkasan Eksekutif

Membangun Python AI Microservice (FastAPI) yang terintegrasi dengan ProcureFlow ERP untuk menganalisis Purchase Request secara otomatis menggunakan Google Gemini API (Free Tier). AI memberikan skor risiko, mendeteksi anomali harga, dan merekomendasikan tindakan bagi Manager/Finance.

---

## 2. Masalah yang Diselesaikan

| Masalah | Dampak | Solusi AI |
| :--- | :--- | :--- |
| Manager harus membaca semua detail item PR satu per satu | Proses approval lambat (10-15 menit per PR) | AI meringkas risiko dalam 5 detik |
| Tidak ada sistem deteksi anomali harga | Requester bisa mengajukan harga jauh di atas harga wajar tanpa terdeteksi | AI membandingkan harga PR dengan harga master item secara otomatis |
| Finance tidak punya insight budget impact sebelum approval | Risiko budget overrun setelah PR disetujui | AI menghitung sisa budget setelah PR disetujui |

---

## 3. Arsitektur Sistem

### 3.1 Stack Teknologi

| Komponen | Teknologi | Port |
| :--- | :--- | :--- |
| Python AI Service | FastAPI + Uvicorn | :8000 |
| Backend API | NestJS (sudah ada) | :3001 |
| Frontend | Next.js 15 (sudah ada) | :3000 |
| Database | PostgreSQL + Prisma | :5432 |
| AI Model | Google Gemini API (`gemini-1.5-flash`) | HTTPS |

### 3.2 Alur Data

```
[User klik "Analisis AI" di /approvals]
        ↓
[Next.js] POST /api/ai/audit-pr/:prId (Bearer JWT)
        ↓
[NestJS] Validasi JWT + Role Guard → Forward ke Python
        ↓
[Python FastAPI] POST /ai/audit-pr
        ↓
[Python] Query PostgreSQL:
   - PurchaseRequest (id, title, totalAmount, priority)
   - PurchaseRequestItem[] (itemName, quantity, estimatedUnitPrice, lineTotal)
   - Budget (allocatedAmount, reservedAmount, consumedAmount)
   - Item Master (estimatedUnitPrice sebagai harga referensi)
        ↓
[Python] Susun prompt + kirim ke Gemini API
        ↓
[Gemini] Return structured JSON
        ↓
[Python → NestJS → Next.js] Tampilkan modal hasil audit
```

### 3.3 Diagram Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    MONOREPO: ProcureFlow_ERP             │
│                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ apps/web │───▶│ apps/api │───▶│    apps/ai       │   │
│  │ Next.js  │    │ NestJS   │    │ Python FastAPI   │   │
│  │ :3000    │    │ :3001    │    │ :8000            │   │
│  └──────────┘    └──────────┘    └────────┬─────────┘   │
│                                           │              │
│                       ┌───────────────────┤              │
│                       ▼                   ▼              │
│              ┌──────────────┐   ┌─────────────────┐     │
│              │ PostgreSQL   │   │ Google Gemini    │     │
│              │ :5432        │   │ API (Free Tier)  │     │
│              └──────────────┘   └─────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Spesifikasi Fitur: Smart PR Risk Audit

### 4.1 User Story

> Sebagai **Manager/Finance**, saya ingin menekan tombol "✨ Analisis AI" pada halaman approval,
> agar saya mendapatkan **skor risiko**, **daftar anomali**, dan **rekomendasi tindakan** dalam 5 detik
> sehingga saya dapat mengambil keputusan approval lebih cepat dan akurat.

### 4.2 Acceptance Criteria

1. Tombol "✨ Analisis AI" muncul di halaman `/approvals` untuk role Manager, Finance, dan Admin.
2. Saat diklik, sistem menampilkan loading spinner selama AI memproses.
3. Modal hasil audit menampilkan:
   - Badge warna risiko: 🟢 LOW (0-39) / 🟡 MEDIUM (40-69) / 🔴 HIGH (70-100)
   - Daftar temuan dengan severity (INFO / WARNING / CRITICAL)
   - Dampak terhadap sisa budget departemen
   - Rekomendasi tindakan (APPROVE / REJECT / INVESTIGATE)
4. Jika Gemini API error atau limit tercapai, tampilkan pesan error yang ramah.

### 4.3 Data yang Dikumpulkan Python dari PostgreSQL

```sql
-- 1. Data Purchase Request
SELECT id, "requestNumber", title, description, status, priority,
       "totalAmount", currency, "departmentId", "budgetId"
FROM "PurchaseRequest" WHERE id = :prId;

-- 2. Item-item dalam PR
SELECT pri.description, pri.quantity, pri."estimatedUnitPrice",
       pri."lineTotal", pri."itemSkuSnapshot", pri."itemNameSnapshot",
       pri."unitNameSnapshot",
       i."estimatedUnitPrice" as "masterPrice"
FROM "PurchaseRequestItem" pri
JOIN "Item" i ON pri."itemId" = i.id
WHERE pri."purchaseRequestId" = :prId;

-- 3. Data Budget Departemen
SELECT id, code, name, "allocatedAmount", "reservedAmount",
       "committedAmount", "consumedAmount",
       ("allocatedAmount" - "reservedAmount" - "committedAmount" - "consumedAmount") as "remainingAmount"
FROM "Budget" WHERE id = :budgetId;
```

### 4.4 JSON Response Contract

```json
{
  "riskScore": 72,
  "riskLevel": "HIGH",
  "budgetImpact": {
    "remainingBefore": 15000000,
    "remainingAfter": 8500000,
    "usagePercentage": 43.3
  },
  "findings": [
    {
      "category": "PRICE_ANOMALY",
      "severity": "CRITICAL",
      "message": "Item 'Laptop Asus ROG' diajukan Rp 18.500.000/unit, 28% lebih mahal dari harga referensi master Rp 14.500.000/unit.",
      "affectedItemSku": "LAPTOP-001"
    },
    {
      "category": "BUDGET_WARNING",
      "severity": "WARNING",
      "message": "Setelah PR ini disetujui, sisa budget Departemen IT hanya tersisa 23%."
    }
  ],
  "recommendation": {
    "action": "INVESTIGATE",
    "justification": "Terdapat anomali harga signifikan pada 1 item. Disarankan meminta klarifikasi harga dari requester."
  }
}
```

---

## 5. Struktur Folder Python AI Service

```
apps/ai/
├── main.py                     ← Entry point FastAPI + CORS
├── config.py                   ← Load .env (GEMINI_API_KEY, DATABASE_URL)
├── requirements.txt            ← Library Python
├── .env                        ← Environment variables
├── db/
│   ├── connection.py           ← Koneksi PostgreSQL (psycopg2/SQLAlchemy)
│   └── queries.py              ← Fungsi query: get_pr_data(), get_budget_data()
├── routers/
│   └── audit_pr.py             ← Route: POST /ai/audit-pr
├── services/
│   └── audit_pr_service.py     ← Logika: ambil data → bangun prompt → panggil Gemini → return JSON
├── prompts/
│   └── audit_pr_prompt.txt     ← Template prompt Gemini (dipisah agar mudah di-tweak)
└── schemas/
    └── audit_pr_schema.py      ← Pydantic: AuditPrRequest, AuditPrResponse, Finding, Recommendation
```

---

## 6. Library Python (requirements.txt)

```
fastapi==0.115.0
uvicorn==0.32.0
google-genai==1.0.0
psycopg2-binary==2.9.10
python-dotenv==1.0.1
pydantic==2.9.0
```

---

## 7. Integrasi NestJS (Proxy Bridge)

### File Baru di `apps/api/src/ai/`:

| File | Fungsi |
| :--- | :--- |
| `ai.module.ts` | Register HttpModule, AiController, AiProxyService |
| `ai-proxy.service.ts` | HTTP Client → forward request ke `http://localhost:8000/ai/*` |
| `ai.controller.ts` | `POST /ai/audit-pr/:id` — Role Guard: Manager, Finance, Admin |
| `dto/audit-pr-response.dto.ts` | TypeScript interface untuk response |

### Modifikasi Existing:

| File | Perubahan |
| :--- | :--- |
| `app.module.ts` | Tambah `AiModule` ke array `imports` |
| `apps/api/.env` | Tambah `PYTHON_AI_SERVICE_URL=http://localhost:8000` |

---

## 8. Integrasi Frontend Next.js

### File Baru di `apps/web/`:

| File | Fungsi |
| :--- | :--- |
| `src/components/ai/AiAuditModal.tsx` | Modal UI menampilkan hasil audit (risk badge, findings, recommendation) |
| `src/lib/api/ai.ts` | Fungsi fetch ke endpoint NestJS `POST /api/ai/audit-pr/:id` |

### Modifikasi Existing:

| File | Perubahan |
| :--- | :--- |
| Halaman `/approvals` | Tambah tombol "✨ Analisis AI" di setiap baris PR |

---

## 9. Model AI & Batasan Free Tier

| Parameter | Nilai |
| :--- | :--- |
| Model | `gemini-1.5-flash` |
| RPM (Request per Menit) | 15 |
| RPD (Request per Hari) | 1.500 |
| TPM (Token per Menit) | 1.000.000 |
| Biaya | **Rp 0 (Gratis)** |
| Estimasi token per audit | ~1.500 - 2.500 token |

---

## 10. Error Handling

| Skenario | Penanganan |
| :--- | :--- |
| Gemini API 429 (Rate Limit) | Return pesan: "Kuota AI harian tercapai. Coba lagi nanti." |
| Gemini API timeout | Return pesan: "Layanan AI sedang sibuk. Coba lagi dalam beberapa saat." |
| PR tidak ditemukan di database | Return 404: "Purchase Request tidak ditemukan." |
| Budget belum di-assign ke PR | Return pesan warning: "PR ini belum memiliki budget terkait." |
| Python service down | NestJS return 503: "Layanan AI sedang tidak tersedia." |
