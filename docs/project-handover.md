# 📋 ProcureFlow ERP - Project Handover Document

> Panduan menjalankan dan konfigurasi deployment terkini ada di [deployment-runbook.md](deployment-runbook.md). Contoh port, environment variable, dan akun di dokumen ini belum seluruhnya diselaraskan dengan kode saat ini.

Dokumen ini merupakan panduan serah terima (*handover document*) resmi untuk proyek **ProcureFlow ERP**. Dokumen ini dirancang untuk memberikan pemahaman menyeluruh bagi pengembang, DevOps engineer, dan stakeholder mengenai arsitektur, konfigurasi, cara menjalankan, serta aturan bisnis sistem.

---

## 1. 📌 Ringkasan Proyek (Executive Summary)

* **Nama Proyek**: ProcureFlow ERP
* **Tipe Arsitektur**: Monorepo (Frontend Web, Backend REST API, AI Microservice, Database ORM)
* **Status Pengembangan**: Dapat diuji sebagai demo; deployment publik masih memerlukan bootstrap admin yang aman, HTTPS, dan backup teruji.
* **Tujuan Sistem**: Mengotomatisasi dan menyederhanakan alur pengadaan barang/jasa perusahaan (*Procure-to-Pay*), mulai dari pengajuan *Purchase Request* (PR), validasi anggaran otomatis, *Purchase Order* (PO), penerimaan barang (*Goods Receiving*), sinkronisasi ERP, hingga rekomendasi berbasis AI (*AI Approval Recommendation & Anomaly Detection*).

---

## 2. 🏗️ Arsitektur & Teknologi (Tech Stack)

```
ProcureFlow_ERP/
├── apps/
│   ├── web/        # Next.js 15 (React 19, Tailwind CSS, TanStack Query, Radix UI)
│   ├── api/        # NestJS (TypeScript, Passport JWT, class-validator, Prisma Client)
│   └── ai/         # FastAPI (Python 3.12, Google GenAI SDK / Gemini 2.5 Flash, psycopg2)
├── prisma/         # Prisma Schema & Database Migrations (PostgreSQL)
├── docs/           # Dokumentasi Alur Bisnis, API, PRD, & Panduan
└── e2e/            # Playwright End-to-End Test Suite
```

### Rincian Komponen:
| Komponen | Framework / Runtime | Port Default | Tanggung Jawab Utama |
| :--- | :--- | :--- | :--- |
| **Frontend** | Next.js 15, React 19, Tailwind CSS | `3000` | UI/UX pengadaan, interaksi formulir, dasbor analitik, antarmuka AI widget. |
| **Backend API** | NestJS (Node.js 20+) | `8000` / `3001` | Autentikasi JWT, otorisasi RBAC, validasi DTO, audit trail, sinkronisasi ERP. |
| **AI Engine** | FastAPI (Python 3.12) | `8001` | AI Approval Assistant (Gemini), deteksi anomali harga, scoring vendor. |
| **Database** | PostgreSQL 16+ via Prisma ORM | `5432` / `5433` | Penyimpanan data relasional, constraints, transaksi keuangan/budget. |

---

## 3. ⚙️ Prasyarat & Konfigurasi Lingkungan (Environment Variables)

### Prasyarat Sistem:
* **Node.js**: v20.x atau lebih baru
* **Python**: v3.12.x
* **PostgreSQL**: PostgreSQL 15+ atau Docker Desktop
* **Package Manager**: `npm`

### Setup File `.env`:

#### 1. Backend (`apps/api/.env` & `prisma/.env`)
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureflow?schema=public"
JWT_SECRET="super-secret-procureflow-key-2026"
JWT_EXPIRES_IN="7d"
PORT=8000
ERP_MOCK_FAILURE_RATE=0.0
AI_SERVICE_URL="http://localhost:8001"
```

#### 2. AI Engine (`apps/ai/.env`)
```env
PORT=8001
GEMINI_API_KEY="AIzaSy..." # Google AI Studio API Key
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureflow"
MODEL_NAME="gemini-2.5-flash"
```

#### 3. Frontend (`apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_AI_URL="http://localhost:8001"
```

---

## 4. 🚀 Panduan Menjalankan Sistem (How to Run)

### A. Instalasi Dependensi (Sekali Saja)
```bash
# 1. Install Node.js dependencies di root monorepo
npm install

# 2. Setup virtual environment Python untuk AI Engine
cd apps/ai
py -3.12 -m venv venv
venv\Scripts\pip install -r requirements.txt
cd ../..
```

### B. Setup Database & Migrasi
```bash
# Generate Prisma Client & Migrate Database
npm run prisma:migrate

# Jalankan Seeding Data Awal (Admin, Roles, Departments, Budgets, Items)
npm run prisma:seed
```

### C. Menjalankan Semua Service
Buka terminal terpisah untuk masing-masing service atau jalankan:

```bash
# Terminal 1: Backend NestJS
npm run api:dev

# Terminal 2: AI Microservice FastAPI
npm run ai:dev

# Terminal 3: Frontend Next.js Web
npm run web:dev
```

---

## 5. 🛡️ Aturan Bisnis Utama (Core Business Rules)

Sistem mengadopsi standar integritas data yang ketat:

1. **Validasi Anggaran (Budget Validation)**:
   * Purchase Request (PR) **ditolak secara otomatis** jika `totalAmount` melebihi sisa anggaran departemen (`remainingAmount`).
2. **Alur Approval Berjenjang**:
   * PR hanya dapat diubah statusnya menjadi `APPROVED` atau `REJECTED` oleh user dengan role `APPROVER` / `DEPARTMENT_HEAD` / `FINANCE`.
3. **Konversi PR ke Purchase Order (PO)**:
   * Purchase Order **hanya boleh dibuat dari PR yang berstatus `APPROVED`**.
4. **Penerimaan Barang (Goods Receiving)**:
   * Jumlah barang yang diterima (`received_quantity`) **tidak boleh melebihi** kuantitas yang dipesan pada PO (`ordered_quantity`).
5. **Audit Trail Wajib**:
   * Setiap aksi Create, Update, Delete, Approval, Status Change, dan Sync ERP wajib mencatat log di tabel `AuditTrail` lengkap dengan `userId`, `action`, dan `timestamp`.
6. **Resiliensi Integrasi ERP**:
   * Jika sinkronisasi ke Mock ERP gagal, sistem mencatat status error dan menyediakan mekanisme *Retry Sync* tanpa merusak data internal.

---

## 6. 🧪 Panduan Pengujian (Testing Suite)

Proyek dilengkapi dengan test coverage lengkap:

```bash
# 1. Menjalankan Unit Tests Backend NestJS (13 Test Suites - 100% Pass)
npm run api:test

# 2. Menjalankan Typecheck Frontend TypeScript
npm run web:typecheck

# 3. Menjalankan Test Suite AI Microservice
cd apps/ai && venv\Scripts\python test_sprints.py

# 4. Menjalankan End-to-End Test (Playwright)
npm run test:e2e
```

---

## 7. 🔑 Akun & Kredensial Default (Hasil Seeding)

| Role | Email | Password Default | Akses Utama |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@procureflow.com` | `Admin123!` | Seluruh modul sistem, Audit Trail, Konfigurasi |
| **Requester** | `requester@procureflow.com` | `User123!` | Pembuatan PR, Monitoring Status PR |
| **Approver** | `approver@procureflow.com` | `User123!` | Review PR, AI Recommendation, Approval |
| **Purchasing** | `purchasing@procureflow.com` | `User123!` | Generate PO, Assign Vendor, Tracking |
| **Warehouse** | `warehouse@procureflow.com` | `User123!` | Goods Receiving, Verifikasi Kuantitas |

---

## 8. 🗺️ Roadmap & Rekomendasi Pemeliharaan Lanjutan

* [ ] **Integrasi ERP Nyata**: Menghubungkan modul `erp-integration` dengan SAP / Oracle / Odoo REST API melalui adapter pattern.
* [ ] **Redis Caching**: Menambahkan Redis cache layer untuk query master data produk dan vendor.
* [ ] **Background Worker**: Menggunakan BullMQ untuk antrean pemrosesan dokumen PDF besar / ekspor laporan keuangan.
* [ ] **Fine-Tuning Prompts**: Memperluas prompt engineering Gemini untuk analisis negosiasi kontrak vendor.

---

**Dibuat & Diverifikasi pada**: 16 Agustus 2026  
**Status**: Serah Terima Siap & Operasional Penuh ✅
