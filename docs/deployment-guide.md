# Panduan Deployment ProcureFlow ERP

> Untuk langkah Docker Compose yang sesuai kode saat ini, gunakan [runbook deployment](deployment-runbook.md). Contoh perintah dan klaim biaya platform di bawah belum diverifikasi ulang; jangan menjadikannya instruksi produksi tanpa memeriksa dokumentasi platform terbaru.

Dokumen ini berisi panduan lengkap untuk melakukan deployment **ProcureFlow ERP** ke berbagai lingkungan produksi:
1. **Google Cloud Platform (GCP)** — *Cloud Run & Cloud SQL (Serverless / Auto-scaling)*
2. **Platform 100% Gratis (Free Tier)** — *Neon + Render/Koyeb + Vercel* atau *Oracle Cloud Always Free*
3. **PaaS Tradisional** — *Railway + Vercel*
4. **Self-Hosted / VPS** — *Docker Compose*

---

## 1. Arsitektur Komponen

ProcureFlow ERP terdiri dari 4 komponen utama:

```
                    ┌─────────────────────────┐
                    │     User Browser        │
                    └────────────┬────────────┘
                                 │
                                 ▼
                         [apps/web] Frontend
                        (Next.js 15, Port 3000)
                                 │
                                 ▼
                         [apps/api] Backend
                         (NestJS, Port 3001)
                           /             \
                          /               \
                         ▼                 ▼
                 PostgreSQL Database    [apps/ai] AI Engine
                   (Prisma ORM)       (FastAPI, Port 8000)
                                           │
                                           ▼
                                    Google Gemini API
```

| Komponen | Direktori | Framework / Teknologi | Port Default |
| :--- | :--- | :--- | :--- |
| **Frontend** | `apps/web` | Next.js 15 (React 19, Tailwind CSS) | 3000 |
| **Backend API** | `apps/api` | NestJS 10 (Passport JWT, Prisma Client) | 3001 |
| **AI Microservice** | `apps/ai` | Python FastAPI (Google GenAI SDK) | 8000 |
| **Database** | `prisma` | PostgreSQL 16 | 5432 |

---

## 2. Environment Variables Reference

### Backend API (`apps/api`)
| Variable | Deskripsi | Contoh Production |
| :--- | :--- | :--- |
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_SECRET` | Secret key untuk signing JWT token | `generate-random-secret-key-64char` |
| `JWT_EXPIRES_IN` | Masa berlaku access token | `1d` atau `7d` |
| `PORT` | Port server NestJS | `3001` (atau disediakan platform) |
| `PYTHON_AI_SERVICE_URL` | URL publik/internal service FastAPI AI | `https://ai.yourdomain.com` atau `http://ai:8000` |
| `AI_SERVICE_API_KEY` | Secret antarservice, sama dengan FastAPI | Simpan melalui secret/environment deployment |
| `FRONTEND_URL` | URL frontend untuk redirect/auth | `https://app.yourdomain.com` |
| `CORS_ORIGIN` | Allowed CORS origins (dipisahkan koma) | `https://app.yourdomain.com` |

### AI Microservice (`apps/ai`)
| Variable | Deskripsi | Contoh Production |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | API Key dari Google AI Studio | `AIzaSy...` |
| `DATABASE_URL` | Connection string psycopg2, tanpa parameter Prisma `schema` | `postgresql://user:pass@host:5432/db` |
| `AI_SERVICE_API_KEY` | Secret antarservice, sama dengan NestJS | Simpan melalui secret/environment deployment |
| `PORT` | Port server FastAPI | `8000` |

### Frontend (`apps/web`)
| Variable | Deskripsi | Contoh Production |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Endpoint base API yang diakses browser | `https://api.yourdomain.com/api` |

---

## 3. Opsi A: Deployment di Google Cloud Platform (GCP)

Metode yang paling direkomendasikan di GCP adalah **Google Cloud Run** (Serverless Container) karena *scale-to-zero* saat idle (sangat hemat biaya), HTTPS otomatis, dan integrasi native dengan Google Cloud SQL & Secret Manager.

### Prasyarat:
- Google Cloud SDK (`gcloud` CLI) terinstall
- Project GCP aktif dengan penagihan (billing) aktif

### Langkah 1: Aktifkan Service GCP
```bash
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com
```

### Langkah 2: Buat Database Cloud SQL (PostgreSQL)
1. Buat instance Cloud SQL:
   ```bash
   gcloud sql instances create procureflow-db \
     --database-version=POSTGRES_16 \
     --tier=db-f1-micro \
     --region=asia-southeast2 \
     --root-password="GantiPasswordDB123!"
   ```
2. Buat database:
   ```bash
   gcloud sql databases create procureflow_erp --instance=procureflow-db
   ```
3. Dapatkan IP Publik atau gunakan Cloud SQL Auth Proxy untuk koneksi Prisma:
   `postgresql://postgres:GantiPasswordDB123!@<IP_CLOUD_SQL>:5432/procureflow_erp?schema=public`

### Langkah 3: Deploy AI Engine ke Cloud Run (`apps/ai`)
```bash
gcloud run deploy procureflow-ai \
  --source . \
  --dockerfile apps/ai/Dockerfile \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-env-vars GEMINI_API_KEY="AIzaSy...",DATABASE_URL="postgresql://postgres:GantiPasswordDB123!@<IP_CLOUD_SQL>:5432/procureflow_erp",AI_SERVICE_API_KEY="<secret-antarservice>"
```
*Simpan URL AI Service yang muncul, misalnya: `https://procureflow-ai-xxx.a.run.app`.*

### Langkah 4: Migrasi Database & Deploy Backend API (`apps/api`)
1. Jalankan migrasi Prisma dari lokal ke Cloud SQL:
   ```bash
   DATABASE_URL="postgresql://postgres:GantiPasswordDB123!@<IP_CLOUD_SQL>:5432/procureflow_erp?schema=public" npx prisma migrate deploy --schema prisma/schema.prisma
   DATABASE_URL="postgresql://postgres:GantiPasswordDB123!@<IP_CLOUD_SQL>:5432/procureflow_erp?schema=public" npm run prisma:seed
   ```
2. Deploy NestJS Backend ke Cloud Run:
   ```bash
   gcloud run deploy procureflow-api \
     --source . \
     --dockerfile apps/api/Dockerfile \
     --region asia-southeast2 \
     --allow-unauthenticated \
     --set-env-vars DATABASE_URL="postgresql://postgres:GantiPasswordDB123!@<IP_CLOUD_SQL>:5432/procureflow_erp?schema=public",JWT_SECRET="kunci-rahasia-jwt-sangat-kuat-12345",PYTHON_AI_SERVICE_URL="https://procureflow-ai-xxx.a.run.app",AI_SERVICE_API_KEY="<secret-antarservice>",CORS_ORIGIN="*"
   ```
*Simpan URL API Service yang muncul, misalnya: `https://procureflow-api-xxx.a.run.app`.*

### Langkah 5: Deploy Frontend Web ke Cloud Run (`apps/web`)
```bash
gcloud run deploy procureflow-web \
  --source . \
  --dockerfile apps/web/Dockerfile \
  --region asia-southeast2 \
  --allow-unauthenticated \
  --set-build-env-vars NEXT_PUBLIC_API_URL="https://procureflow-api-xxx.a.run.app/api"
```

---

## 4. Opsi B: Deployment di Platform 100% GRATIS (Free Tier)

Jika ingin mendeploy sistem secara utuh tanpa mengeluarkan biaya sama sekali:

### Strategi Multi-Platform:

```
[Vercel Free]            [Render / Koyeb Free]        [Render / Koyeb Free]        [Neon.tech Free]
  Next.js 15    ───────►     NestJS API       ──────►     FastAPI AI       ──────►  PostgreSQL DB
 (apps/web)                  (apps/api)                    (apps/ai)              (Serverless)
```

#### 1. Setup Database Gratis di Neon.tech
1. Buka [neon.tech](https://neon.tech) dan daftar gratis (Free Tier 0.5 GB Storage).
2. Buat database baru bernama `procureflow_erp`.
3. Salin connection string yang berformat:
   `postgresql://username:password@ep-xyz.region.aws.neon.tech/procureflow_erp?sslmode=require`
4. Jalankan migrasi Prisma dari terminal lokal Anda:
   ```bash
   # Masukkan DATABASE_URL Neon ke apps/api/.env
   npm run prisma:generate
   npx prisma migrate deploy --schema prisma/schema.prisma
   npm run prisma:seed
   ```

#### 2. Deploy AI Engine di Render.com / Koyeb
1. Login ke [render.com](https://render.com) > **New +** > **Web Service** > Hubungkan repo GitHub.
2. Konfigurasi:
   - **Root Directory**: `apps/ai`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: `Free`
3. Environment Variables:
   - `GEMINI_API_KEY` = *API key Gemini Anda*
   - `DATABASE_URL` = *Connection string Neon tanpa parameter `schema` Prisma*
   - `AI_SERVICE_API_KEY` = *Secret acak yang sama dengan backend*
4. Catat URL service: `https://procureflow-ai.onrender.com`.

#### 3. Deploy Backend API di Render.com / Koyeb
1. Di Render.com, buat **New Web Service** kedua:
   - **Root Directory**: *(Kosongkan - root monorepo)*
   - **Runtime**: `Node`
   - **Build Command**: `npm ci && npm run prisma:generate -w @procureflow/api && npm run api:build`
   - **Start Command**: `node apps/api/dist/src/main.js`
   - **Plan**: `Free`
2. Environment Variables:
   - `DATABASE_URL` = *Connection string Neon*
   - `JWT_SECRET` = *String acak rahasia 32+ karakter*
   - `PYTHON_AI_SERVICE_URL` = `https://procureflow-ai.onrender.com`
   - `AI_SERVICE_API_KEY` = *Secret acak yang sama dengan service AI*
   - `PORT` = `3001`
   - `CORS_ORIGIN` = `*`
3. Catat URL API: `https://procureflow-api.onrender.com`.

#### 4. Deploy Frontend di Vercel
1. Buka [vercel.com](https://vercel.com) > **Add New...** > **Project** > Import repo GitHub.
2. Pengaturan Project:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: `apps/web`
3. Environment Variables:
   - `NEXT_PUBLIC_API_URL` = `https://procureflow-api.onrender.com/api`
4. Klik **Deploy**. Frontend langsung aktif dengan HTTPS gratis!

---

## 5. Opsi C: Oracle Cloud "Always Free" VM (Single Server - Bebas Sleep)

Oracle Cloud Infrastructure (OCI) memberikan **4 OCPU ARM + 24 GB RAM + 200 GB Storage GRATIS SELAMANYA**. Ini adalah opsi gratis terbaik jika Anda ingin server VPS yang tidak pernah sleep/idle.

### Langkah Setup di VM Ubuntu:
1. SSH ke VM Oracle Cloud Anda.
2. Install Docker & Docker Compose:
   ```bash
   sudo apt update && sudo apt install -y docker.io docker-compose git
   sudo usermod -aG docker $USER
   ```
3. Clone repository:
   ```bash
   git clone https://github.com/username/ProcureFlow_ERP.git
   cd ProcureFlow_ERP
   ```
4. Buat file `.env` di root direktori:
   ```env
   POSTGRES_USER=postgres
   POSTGRES_PASSWORD=PasswordKuatProduksi123!
   POSTGRES_DB=procureflow_erp
   JWT_SECRET=super-secret-jwt-key-production
   GEMINI_API_KEY=AIzaSy...
   NEXT_PUBLIC_API_URL=http://<IP_PUBLIC_VM>:3001/api
   ```
5. Jalankan seluruh stack dengan Docker Compose:
   ```bash
   docker compose -f docker-compose.prod.yml up -d --build
   ```
6. Jalankan migrasi Prisma di dalam container API:
   ```bash
   docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy --schema prisma/schema.prisma
   docker compose -f docker-compose.prod.yml exec api npm run prisma:seed
   ```

---

## 6. Opsi D: Railway + Vercel Deployment

1. **Railway Setup**:
   - Buat project baru di [Railway.app](https://railway.app).
   - Tambahkan plugin **PostgreSQL**.
   - Tambahkan service untuk `apps/api` dan `apps/ai`.
   - Start command API:
     ```bash
     npm run api:build && npm run prisma:generate && npx prisma migrate deploy --schema prisma/schema.prisma && npm run start -w @procureflow/api
     ```
2. **Vercel Setup**:
   - Hubungkan ke `apps/web`.
   - Set `NEXT_PUBLIC_API_URL` mengarah ke domain Railway API.

---

## 7. CI/CD GitHub Actions

Workflow otomatis untuk menjalankan linting, testing, build, dan validasi:

`.github/workflows/ci.yml`:
```yaml
name: CI & Quality Gate

on:
  push:
    branches: [main, master]
  pull_request:

jobs:
  test-and-build:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: procureflow_erp
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Node Dependencies
        run: npm ci

      - name: Generate Prisma Client & Migrate
        run: |
          npm run prisma:generate
          npx prisma migrate deploy --schema prisma/schema.prisma
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/procureflow_erp?schema=public

      - name: Run Backend Unit & Integration Tests
        run: |
          npm run api:build
          npm run api:test
          npm run api:test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/procureflow_erp?schema=public
          JWT_SECRET: test-secret

      - name: Run Frontend Tests & Build
        run: |
          npm run web:typecheck
          npm run web:lint
          npm run web:test
          npm run web:build
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3001/api

      - name: Setup Python 3.11
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Test AI Microservice
        run: |
          cd apps/ai
          pip install -r requirements.txt
          python -m pytest test_sprints.py || true
```

---

## 8. Common Deployment Errors and Solutions

| Error | Penyebab | Solusi |
| :--- | :--- | :--- |
| **Prisma Client not generated** | Build container tidak mengeksekusi generate | Tambahkan `npm run prisma:generate` sebelum `nest build` |
| **P2021 / Table does not exist** | Migrasi belum dijalankan di DB target | Eksekusi `npx prisma migrate deploy --schema prisma/schema.prisma` |
| **CORS policy block** | Origin frontend belum didaftarkan di backend | Set `CORS_ORIGIN` di backend sesuai URL frontend |
| **AI 502 / Connection Refused** | Backend API tidak bisa menjangkau URL FastAPI | Periksa `PYTHON_AI_SERVICE_URL` di env backend |
| **Next.js API 404 / undefined** | `NEXT_PUBLIC_API_URL` tidak disertakan saat build | Set environment variable `NEXT_PUBLIC_API_URL` sebelum build dijalankan |
| **Cold Start / Timeout di Free Tier** | Free instance (Render) sleep setelah 15 menit idle | Request pertama butuh ~30-50 detik untuk bangun, atau gunakan uptime monitor (UptimeRobot) |

---

## 9. Production Checklist

- [ ] Database PostgreSQL sudah dibuat dan dapat diakses.
- [ ] `npx prisma migrate deploy` berhasil dieksekusi di database produksi.
- [ ] Initial seed / data admin awal (`npm run prisma:seed`) berhasil.
- [ ] `GEMINI_API_KEY` aktif dan valid di Google AI Studio.
- [ ] AI Engine FastAPI berhasil start dan endpoint `/health` merespons `200 OK`.
- [ ] `JWT_SECRET` di backend menggunakan string acak yang aman.
- [ ] Backend API berhasil start dan terhubung ke DB serta AI engine.
- [ ] `NEXT_PUBLIC_API_URL` di frontend mengarah ke URL publik backend (`/api`).
- [ ] Login dengan akun demo berhasil di frontend.
- [ ] Fitur AI (Chatbot, Smart PR, Smart PO, Supplier Risk, Audit Anomaly) merespons dengan benar.
- [ ] Audit trail mencatat log aktivitas di database.

---

## 10. Demo Accounts (Bawaan Seed)

| Role | Email | Password |
| :--- | :--- | :--- |
| **Admin** | `admin@procureflow.com` | `password123` |
| **Requester** | `requester@procureflow.com` | `password123` |
| **Manager** | `manager@procureflow.com` | `password123` |
| **Finance** | `finance@procureflow.com` | `password123` |
| **Purchasing** | `purchasing@procureflow.com` | `password123` |
| **Warehouse** | `warehouse@procureflow.com` | `password123` |
| **Auditor** | `auditor@procureflow.com` | `password123` |
