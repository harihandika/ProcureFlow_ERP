# Backend Testing

## Strategy

- Unit tests use Jest with `ts-jest` and should mock external infrastructure, especially Prisma.
- E2E and integration tests should run against an isolated PostgreSQL database from `apps/api/.env.test`.
- The test database name should clearly contain `test`; the cleanup helper refuses to truncate any database that does not look like a test database.
- Keep `.env.test` local and copy values from `.env.test.example`.

## Local setup

1. Create a PostgreSQL database named `procureflow_erp_test`.
2. Copy `apps/api/.env.test.example` to `apps/api/.env.test`.
3. Apply the Prisma schema to the test database:

```powershell
cd apps/api
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureflow_erp_test?schema=public"
npm run prisma:generate
npx prisma db push --schema ../../prisma/schema.prisma
```

Run unit tests with `npm run api:test`.
Run e2e tests with `npm run api:test:e2e`.
