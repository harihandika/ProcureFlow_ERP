---
name: AI Sprint Runner
description: Menjalankan sprint implementasi ProcureFlow AI Engine. User cukup ketik "jalankan sprint 1" sampai "sprint 5" untuk membangun AI microservice Python FastAPI yang terintegrasi dengan ProcureFlow ERP. Sprint mencakup setup Python, database, Gemini API, NestJS bridge, dan frontend UI.
---

# AI Sprint Runner — ProcureFlow AI Engine

Skill ini digunakan untuk mengeksekusi sprint pembangunan AI Engine.
Ketika user meminta menjalankan sprint tertentu, baca file referensi sprint yang sesuai lalu **eksekusi semua instruksi di dalamnya tanpa bertanya**.

## Cara Kerja

1. User mengetik: `"jalankan sprint 1"` (atau `"sprint 2"`, dst.)
2. Baca file referensi sprint yang sesuai di folder `references/` skill ini.
3. **Langsung eksekusi** semua instruksi di dalam file sprint tersebut.
4. Jangan minta konfirmasi kecuali ada error yang membutuhkan keputusan user.
5. Setelah selesai, laporkan ringkasan apa yang sudah dibuat.

## Daftar Sprint

| Sprint | File Referensi | Deskripsi |
|--------|---------------|-----------|
| Sprint 1 | `references/sprint-1.md` | Setup project Python FastAPI di `apps/ai/` |
| Sprint 2 | `references/sprint-2.md` | Koneksi database PostgreSQL + Pydantic schemas |
| Sprint 3 | `references/sprint-3.md` | Prompt template + Service logic + Router endpoint |
| Sprint 4 | `references/sprint-4.md` | NestJS proxy bridge (AiModule) |
| Sprint 5 | `references/sprint-5.md` | Frontend UI modal + Testing + Error handling |

## Konteks Project

- **Monorepo**: `ProcureFlow_ERP/`
- **Backend**: `apps/api/` — NestJS, port 3001
- **Frontend**: `apps/web/` — Next.js 15, port 3000
- **AI Service**: `apps/ai/` — Python FastAPI, port 8000 (BARU)
- **Database**: PostgreSQL, port 5432
- **PRD Lengkap**: `docs/ai-prd.md`
- **Model Gemini**: `gemini-1.5-flash` (Free Tier)

## Aturan Eksekusi

1. Baca PRD di `docs/ai-prd.md` jika perlu konteks tambahan tentang data contract atau arsitektur.
2. Jangan modifikasi file yang tidak disebutkan dalam instruksi sprint.
3. Setelah membuat file, verifikasi dengan membaca ulang file tersebut.
4. Jika sprint memerlukan install package, jalankan perintahnya.
5. Laporkan file apa saja yang dibuat/dimodifikasi di akhir sprint.
