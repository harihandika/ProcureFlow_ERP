# Panduan Deployment ProcureFlow ERP

## Target Deployment

| Layer | Platform |
| --- | --- |
| Frontend | Vercel |
| Backend | Railway |
| Database | Railway PostgreSQL |
| Migration | `prisma migrate deploy` |
| CI/CD | GitHub Actions |

## Environment Variables

### Backend

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="production-secret"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="https://procureflow.vercel.app"
BACKEND_URL="https://procureflow-api.railway.app"
CORS_ORIGIN="https://procureflow.vercel.app"
```

### Frontend

```env
NEXT_PUBLIC_API_URL="https://procureflow-api.railway.app/api"
```

## Local Build Steps

```bash
npm install
npm run prisma:generate
npm run api:build
npm run web:build
```

Jika menggunakan database lokal:

```bash
npm run prisma:migrate
npm run prisma:seed
```

## Production Build Steps

Backend:

```bash
npm run prisma:generate
npm run api:build
npm run prisma:migrate:deploy
```

Frontend:

```bash
npm run web:build
```

Jika script `prisma:migrate:deploy` belum tersedia, gunakan:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

## Railway Backend Deployment

1. Buat project baru di Railway.
2. Tambahkan PostgreSQL service.
3. Tambahkan backend service dari repository GitHub.
4. Set root directory sesuai struktur monorepo jika diperlukan.
5. Tambahkan environment variables backend.
6. Pastikan `DATABASE_URL` mengarah ke Railway PostgreSQL.
7. Jalankan Prisma migration saat deploy.
8. Start backend NestJS.

Contoh start command:

```bash
npm run api:build && npm run prisma:generate && npx prisma migrate deploy --schema prisma/schema.prisma && npm run start -w @procureflow/api
```

## Vercel Frontend Deployment

1. Import repository ke Vercel.
2. Pilih app frontend atau set root directory ke `apps/web`.
3. Tambahkan `NEXT_PUBLIC_API_URL`.
4. Jalankan build.
5. Pastikan frontend dapat mengakses backend Railway.

Contoh environment:

```env
NEXT_PUBLIC_API_URL=https://procureflow-api.railway.app/api
```

## Database Migration Steps

Untuk production:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

Untuk development:

```bash
npm run prisma:migrate
```

Untuk generate Prisma Client:

```bash
npm run prisma:generate
```

## GitHub Actions CI/CD

Recommended jobs:

1. Install dependencies.
2. Generate Prisma client.
3. Run backend build and tests.
4. Run frontend typecheck, lint, and tests.
5. Run Playwright if test database is available.
6. Deploy backend to Railway.
7. Deploy frontend to Vercel.

Example high-level workflow:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run prisma:generate
      - run: npm run api:build
      - run: npm run api:test
      - run: npm run web:typecheck
      - run: npm run web:lint
      - run: npm run web:test
```

## Common Deployment Errors and Solutions

| Error | Cause | Solution |
| --- | --- | --- |
| Prisma Client not generated | Build tidak menjalankan generate | Jalankan `npm run prisma:generate` sebelum build/start |
| Migration failed | DATABASE_URL salah atau database tidak reachable | Periksa Railway PostgreSQL URL dan network |
| CORS error | Frontend domain belum diizinkan | Set `CORS_ORIGIN` ke URL Vercel |
| 401 Unauthorized | JWT invalid atau expired | Login ulang dan pastikan `JWT_SECRET` konsisten |
| API URL undefined | Frontend env belum diset | Set `NEXT_PUBLIC_API_URL` di Vercel |
| Build workspace gagal | Root directory salah | Pastikan command dan workspace sesuai monorepo |
| Database table missing | Migration belum dijalankan | Jalankan `prisma migrate deploy` |

## Production Checklist

- [ ] Railway PostgreSQL tersedia.
- [ ] `DATABASE_URL` sudah benar.
- [ ] `JWT_SECRET` kuat dan tidak sama dengan development.
- [ ] `CORS_ORIGIN` mengarah ke domain frontend.
- [ ] `NEXT_PUBLIC_API_URL` mengarah ke backend production.
- [ ] Prisma migration berhasil.
- [ ] Backend Swagger dapat diakses jika memang dibuka untuk production.
- [ ] Frontend login berhasil.
- [ ] Demo accounts tersedia jika digunakan untuk portfolio demo.
- [ ] Audit trail berjalan.
- [ ] Error logging dan monitoring sudah disiapkan.

## Demo Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@procureflow.com` | `password123` |
| Requester | `requester@procureflow.com` | `password123` |
| Manager | `manager@procureflow.com` | `password123` |
| Finance | `finance@procureflow.com` | `password123` |
| Purchasing | `purchasing@procureflow.com` | `password123` |
| Warehouse | `warehouse@procureflow.com` | `password123` |
| Auditor | `auditor@procureflow.com` | `password123` |
