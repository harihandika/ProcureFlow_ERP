# ProcureFlow ERP

Portfolio backend for a purchase request, approval workflow, budget control, receiving, and ERP sync simulation system.

This first backend slice implements:

- Prisma schema for users, roles, user-role assignments, and departments
- NestJS API scaffold
- Auth, Users, Roles, and Departments modules
- JWT authentication and role-based authorization
- DTO validation with `class-validator`
- Swagger setup at `/api/docs`
- Global exception filter
- Pagination, search, and filters for the first CRUD modules
- Seed data for roles, departments, and demo users
- Unit tests and a lightweight auth integration test

## Local Setup

```bash
npm install
docker compose up -d
cp apps/api/.env.example apps/api/.env
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run api:dev
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

Only these backend modules are implemented for now:

- AuthModule
- UsersModule
- RolesModule
- DepartmentsModule

The remaining business modules are intentionally not implemented or modeled yet.
