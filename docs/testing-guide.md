# Panduan Testing ProcureFlow ERP

## Testing Strategy

ProcureFlow ERP menggunakan beberapa lapisan testing:

| Layer | Tool | Tujuan |
| --- | --- | --- |
| Backend unit test | Jest | Menguji service dan business logic secara terisolasi |
| Backend integration/e2e | Jest + Supertest | Menguji endpoint API dan guard |
| Frontend component test | React Testing Library | Menguji komponen UI |
| Frontend integration test | RTL + mocked API/MSW | Menguji komponen API-connected |
| Browser E2E | Playwright | Menguji flow bisnis utama dari sisi pengguna |

## Backend Unit Test

Backend unit test digunakan untuk service seperti:

- AuthService
- UsersService
- BudgetsService
- PurchaseRequestsService
- ApprovalsService
- PurchaseOrdersService
- ReceivingService
- ErpIntegrationService
- AuditTrailsService

Contoh command:

```bash
npm run api:test
```

## Backend Integration Test

Integration test menggunakan Supertest untuk menguji endpoint.

Contoh area yang diuji:

- Login berhasil dan gagal.
- Protected route menolak request tanpa token.
- Role guard menolak role yang tidak sesuai.
- CRUD master data.
- Budget validation.
- Submit purchase request.
- Approval action.
- Generate PO.
- Receiving.
- ERP sync dan retry.
- Audit trail filter.

Command:

```bash
npm run api:test:e2e
```

## Frontend Component Test

Frontend component test memastikan komponen render dan interaksi dasar berjalan.

Contoh test:

- Login form render.
- Validation error muncul.
- Sidebar menampilkan menu berdasarkan role.
- Dashboard summary card render.
- Data table render rows.
- Modal create/edit buka dan tutup.
- Status badge menampilkan status yang benar.
- PR form dapat add/remove item row.
- Total PR dihitung otomatis.

Command:

```bash
npm run web:test
```

## Frontend Integration Test

Frontend integration test menggunakan mock API request untuk komponen yang sudah terhubung API.

Contoh test:

- Loading state.
- Error state.
- Empty state.
- Success state.
- Create mutation success.
- Update mutation success.
- Delete mutation success.
- Unauthorized response redirect ke login.
- Form submit memanggil endpoint yang benar.

## Playwright E2E Test

Playwright digunakan untuk menguji flow utama dari browser.

Main E2E scenario:

1. Admin login.
2. Admin creates department.
3. Admin creates item.
4. Admin creates supplier.
5. Finance creates budget.
6. Requester creates PR.
7. Manager approves PR.
8. Finance approves PR.
9. Purchasing generates PO.
10. Warehouse receives item.
11. Purchasing syncs PO to ERP.
12. Admin checks audit trail.

Command:

```bash
npm run test:e2e
```

## Test Database Strategy

Gunakan database PostgreSQL khusus test.

Contoh:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureflow_erp_test?schema=public"
NODE_ENV="test"
JWT_SECRET="test-jwt-secret"
JWT_EXPIRES_IN="15m"
BCRYPT_SALT_ROUNDS="4"
```

Prinsip:

- Nama database harus mengandung kata `test`.
- Test setup boleh melakukan truncate data.
- Jangan menggunakan database development atau production untuk test otomatis.
- Seed user dan role sebelum test berjalan.

## Example Test Cases Per Module

| Module | Example Test Cases |
| --- | --- |
| Auth | Login success, wrong password, unknown email, get current user |
| Users/Roles | Admin create user, assign role, unauthorized user blocked |
| Master Data | Create, update, delete, search, pagination, validation |
| Budgets | Finance create budget, calculate remaining, prevent unauthorized create |
| Purchase Requests | Create draft, multiple items, calculate total, submit, insufficient budget |
| Approvals | Queue visible, approve, reject with reason, role guard |
| Purchase Orders | Generate from approved PR, block unapproved PR, update status |
| Receiving | Partial receiving, full receiving, prevent over receiving |
| ERP Sync | Sync success, sync failed, retry failed sync |
| Audit Trail | Record action, filter by module/user/action/date, show old/new value |

## Recommended Commands

```bash
npm run prisma:generate
npm run api:build
npm run api:test
npm run api:test:e2e
npm run web:typecheck
npm run web:lint
npm run web:test
npm run test:e2e
```

## CI Testing Order

Recommended order for CI:

1. Install dependencies.
2. Generate Prisma client.
3. Run backend build.
4. Run backend unit test.
5. Run backend e2e test with test database.
6. Run frontend typecheck.
7. Run frontend lint.
8. Run frontend tests.
9. Run Playwright E2E.
