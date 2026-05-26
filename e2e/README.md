# Playwright E2E

These tests target the isolated PostgreSQL test database.

Before running:

```powershell
createdb procureflow_erp_test
Copy-Item apps/api/.env.test.example apps/api/.env.test
npm run test:e2e
```

The Playwright global setup applies the Prisma schema with `prisma db push`, truncates the test database, seeds E2E users, and creates supporting packaging-unit and warehouse records.
