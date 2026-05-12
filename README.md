# ProcureFlow ERP

Portfolio project for a purchase request, approval workflow, budget control, receiving, and ERP sync simulation system.

The current project slice implements:

- Prisma schema for users, roles, departments, and master data
- NestJS API scaffold
- Auth, Users, Roles, and Departments modules
- Items, Suppliers, Warehouses, and Packaging Units modules
- Budget module with allocation and adjustment transactions
- Purchase Request module with draft creation, multiple items, budget validation, and submission
- Receiving module with partial receiving and barcode/item code simulation
- ERP Integration module with mock PO sync, failure simulation, retry handling, and sync logs
- Audit Trail module with protected audit log query endpoints and action recording service
- JWT authentication and role-based authorization
- DTO validation with `class-validator`
- Swagger setup at `/api/docs`
- Global exception filter
- Pagination, search, and filters for CRUD modules
- Seed data for roles, departments, demo users, and master data
- Unit tests and a lightweight auth integration test
- Next.js App Router frontend shell in `apps/web`
- Enterprise dashboard, role-based sidebar, modal forms, detail drawers, status badges, and dummy module pages
- Frontend authentication flow with React Hook Form, Zod validation, Axios client, JWT storage, protected routes, and logout

## Local Setup

```bash
npm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run api:dev
npm run web:dev
```

Frontend runs on `http://localhost:3000` by default. Swagger runs on `/api/docs` from the API server.

Create `apps/web/.env` when the API URL differs from the default:

```txt
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

Demo password for all seeded users:

```txt
Password123!
```

## Demo Users

```txt
admin@procureflow.test
finance@procureflow.test
manager@procureflow.test
requester@procureflow.test
purchasing@procureflow.test
warehouse@procureflow.test
```

## Current Scope

These backend modules are implemented for now:

- AuthModule
- UsersModule
- RolesModule
- DepartmentsModule
- ItemsModule
- SuppliersModule
- WarehousesModule
- PackagingUnitsModule
- BudgetsModule
- PurchaseRequestsModule
- ReceivingModule
- ErpIntegrationModule
- AuditTrailsModule

Approval and Purchase Order API modules are intentionally not implemented yet.

The frontend currently uses dummy data for:

- Login
- Dashboard
- Items
- Suppliers
- Departments
- Warehouses
- Packaging Units
- Budgets
- Purchase Requests
- Approvals
- Purchase Orders
- Receiving
- ERP Sync Logs
- Audit Trails
