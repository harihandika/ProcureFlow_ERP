# ProcureFlow ERP

ProcureFlow ERP is a fullstack portfolio project that simulates an enterprise procurement workflow: Purchase Request, Budget Control, Approval Workflow, Purchase Order, Receiving, ERP Integration Simulation, Dashboard, and Audit Trail.

The project demonstrates how a procurement process can be modeled end to end with role-based access, API integration, budget validation, approval controls, receiving tracking, and operational audit logs.

## Problem Statement

Many procurement workflows are still handled through spreadsheets, chat messages, or disconnected systems. This makes it difficult to control budgets, track approval status, verify receiving progress, and audit important actions.

ProcureFlow ERP solves this problem by providing a structured procurement workflow where every important step is validated, recorded, and visible to the correct business role.

## Key Features

| Area              | Features                                                           |
| ----------------- | ------------------------------------------------------------------ |
| Authentication    | JWT login, protected routes, role-based sidebar                    |
| Master Data       | Departments, items, suppliers, warehouses, packaging units         |
| Budget Control    | Allocation, used amount, remaining amount, usage warnings          |
| Purchase Request  | Multi-item PR, frontend calculation, budget validation             |
| Approval Workflow | Manager/Finance approval queue, approve/reject actions             |
| Purchase Order    | Generate PO from approved PR, supplier assignment, status tracking |
| Receiving         | Partial and full receiving, barcode/item code simulation           |
| ERP Sync          | Mock ERP sync, success/failure logs, retry failed sync             |
| Audit Trail       | Important actions recorded with old/new values where available     |
| Dashboard         | Procurement summary cards and charts                               |

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- ShadCN UI
- React Hook Form
- Zod
- TanStack Query
- Axios
- Recharts

### Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT Authentication
- Passport
- Bcrypt
- Class Validator
- Swagger/OpenAPI

### Testing

- Jest
- React Testing Library
- Supertest
- Playwright

## Business Flow Summary

```mermaid
flowchart LR
  A[Master Data Setup] --> B[Budget Allocation]
  B --> C[Purchase Request]
  C --> D[Budget Validation]
  D --> E[Approval Workflow]
  E --> F[Purchase Order]
  F --> G[Receiving]
  G --> H[ERP Sync Simulation]
  H --> I[Audit Trail]
```

1. Admin prepares master data.
2. Finance creates department budgets.
3. Requester creates and submits a purchase request.
4. System validates available budget.
5. Manager and/or Finance approves the request.
6. Purchasing generates a purchase order.
7. Warehouse receives goods partially or fully.
8. Purchasing syncs the PO to mock ERP.
9. System records important actions in the audit trail.

## Role Summary

| Role       | Main Responsibility                                   |
| ---------- | ----------------------------------------------------- |
| Admin      | System setup, users, roles, master data, audit review |
| Requester  | Create and submit purchase requests                   |
| Manager    | Review and approve/reject purchase requests           |
| Finance    | Manage budgets and approve budget-related requests    |
| Purchasing | Generate purchase orders and sync to ERP              |
| Warehouse  | Record goods receiving                                |
| Auditor    | Review audit trail and business activity history      |

## Project Modules

- Authentication & Authorization
- Dashboard
- User & Role Management
- Departments
- Items
- Suppliers
- Warehouses
- Packaging Units
- Budgets
- Purchase Requests
- Approvals
- Purchase Orders
- Receiving
- ERP Sync Logs
- Audit Trails

## Screenshots

Screenshots can be added here when the project is deployed.

| Page              | Screenshot                               |
| ----------------- | ---------------------------------------- |
| Dashboard         | `docs/screenshots/dashboard.png`         |
| Purchase Requests | `docs/screenshots/purchase-requests.png` |
| Approval Queue    | `docs/screenshots/approvals.png`         |
| Purchase Orders   | `docs/screenshots/purchase-orders.png`   |
| Receiving         | `docs/screenshots/receiving.png`         |
| Audit Trail       | `docs/screenshots/audit-trails.png`      |

## Demo Accounts

| Role       | Email                        | Password       |
| ---------- | ---------------------------- | -------------- |
| Admin      | `admin@procureflow.test`     | `Password123!` |
| Requester  | `requester@procureflow.com`  | `password123`  |
| Manager    | `manager@procureflow.com`    | `password123`  |
| Finance    | `finance@procureflow.com`    | `password123`  |
| Purchasing | `purchasing@procureflow.com` | `password123`  |
| Warehouse  | `warehouse@procureflow.com`  | `password123`  |
| Auditor    | `auditor@procureflow.com`    | `password123`  |

Local seeded accounts may use `.test` emails depending on the seed file.

## Local Installation

### Prerequisites

- Node.js 20+
- npm
- PostgreSQL
- Git

### Setup

```bash
git clone <repository-url>
cd procureflow-erp
npm install
```

Create backend environment file:

```bash
cp apps/api/.env.example apps/api/.env
```

Generate Prisma client and run migrations:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

Run backend and frontend:

```bash
npm run api:dev
npm run web:dev
```

Default URLs:

| Service      | URL                              |
| ------------ | -------------------------------- |
| Frontend     | `http://localhost:3000`          |
| Backend API  | `http://localhost:3001/api`      |
| Swagger Docs | `http://localhost:3001/api/docs` |

## Environment Variables Example

Backend:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/procureflow_erp?schema=public"
JWT_SECRET="change-this-secret"
JWT_EXPIRES_IN="1d"
FRONTEND_URL="http://localhost:3000"
BACKEND_URL="http://localhost:3001"
CORS_ORIGIN="http://localhost:3000"
```

Frontend:

```env
NEXT_PUBLIC_API_URL="http://localhost:3001/api"
```

## Testing Commands

```bash
npm run api:test
npm run api:test:e2e
npm run web:test
npm run test:e2e
```

| Command                | Purpose                                  |
| ---------------------- | ---------------------------------------- |
| `npm run api:test`     | Backend unit tests                       |
| `npm run api:test:e2e` | Backend Supertest integration tests      |
| `npm run web:test`     | Frontend component and integration tests |
| `npm run test:e2e`     | Playwright browser E2E flow              |

## Deployment Summary

| Layer            | Target                  |
| ---------------- | ----------------------- |
| Frontend         | Vercel                  |
| Backend          | Railway                 |
| Database         | Railway PostgreSQL      |
| Prisma Migration | `prisma migrate deploy` |
| CI/CD            | GitHub Actions          |

Production deployment should run database migrations before starting the backend application.

## Portfolio Value

This project is designed to show practical fullstack engineering skills:

- Enterprise-style domain modeling
- Secure authentication and authorization
- Clean API integration with TanStack Query and Axios
- Backend validation and role guards
- Transaction-heavy business workflows
- Testing across unit, integration, and E2E layers
- Deployment-ready monorepo structure
- Professional documentation for GitHub portfolio presentation

## Documentation

- [User Manual](docs/user-manual.md)
- [Features](docs/features.md)
- [Business Flow](docs/business-flow.md)
- [Role Access](docs/role-access.md)
- [Database Design](docs/database-design.md)
- [API Overview](docs/api-overview.md)
- [Testing Guide](docs/testing-guide.md)
- [Deployment Guide](docs/deployment-guide.md)

## License

This project is provided for portfolio and educational purposes. Add a formal license file if the repository will be distributed publicly.
