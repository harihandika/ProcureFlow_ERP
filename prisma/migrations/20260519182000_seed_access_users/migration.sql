-- Seed baseline access data so a freshly migrated database can be used immediately.
-- Demo password for every user below: Password123!

INSERT INTO "Role" ("id", "name", "description", "isSystem", "createdAt", "updatedAt", "deletedAt")
VALUES
  ('00000000-0000-4000-8000-000000000001', 'ADMIN', 'Full system administration access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000002', 'FINANCE', 'Budget control and finance approval access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000003', 'MANAGER', 'Department-level approval access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000004', 'REQUESTER', 'Purchase request creation access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000005', 'PURCHASING', 'Purchase order creation and ERP sync access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000006', 'WAREHOUSE', 'Receiving and warehouse operation access.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("name") DO UPDATE SET
  "description" = EXCLUDED."description",
  "isSystem" = EXCLUDED."isSystem",
  "updatedAt" = CURRENT_TIMESTAMP,
  "deletedAt" = NULL;

INSERT INTO "Department" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt", "deletedAt")
VALUES
  ('00000000-0000-4000-8000-000000000101', 'FIN', 'Finance', 'Budgeting, cost control, and finance approvals.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000102', 'IT', 'Information Technology', 'Internal technology procurement and services.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000103', 'OPS', 'Operations', 'Operational purchasing and fulfilment.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000104', 'PUR', 'Purchasing', 'Supplier coordination and purchase orders.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000105', 'WH', 'Warehouse', 'Goods receiving and inventory handover.', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("code") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = CURRENT_TIMESTAMP,
  "deletedAt" = NULL;

INSERT INTO "User" ("id", "email", "username", "passwordHash", "fullName", "jobTitle", "status", "departmentId", "createdAt", "updatedAt", "deletedAt")
VALUES
  ('00000000-0000-4000-8000-000000000201', 'admin@procureflow.test', 'admin', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Alya Admin', 'System Administrator', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'IT'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000202', 'finance@procureflow.test', 'finance', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Faris Finance', 'Finance Controller', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'FIN'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000203', 'manager@procureflow.test', 'manager', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Maya Manager', 'IT Manager', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'IT'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000204', 'requester@procureflow.test', 'requester', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Rina Requester', 'IT Requester', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'IT'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000205', 'purchasing@procureflow.test', 'purchasing', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Pandu Purchasing', 'Purchasing Officer', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'PUR'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL),
  ('00000000-0000-4000-8000-000000000206', 'warehouse@procureflow.test', 'warehouse', '$2b$12$8O2nsm4gCHce84ytmnzIN.jwF.VK3lxQcYfKE6ibQEeaUeLPxxopO', 'Wahyu Warehouse', 'Warehouse Officer', 'ACTIVE', (SELECT "id" FROM "Department" WHERE "code" = 'WH'), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("email") DO UPDATE SET
  "username" = EXCLUDED."username",
  "passwordHash" = EXCLUDED."passwordHash",
  "fullName" = EXCLUDED."fullName",
  "jobTitle" = EXCLUDED."jobTitle",
  "status" = EXCLUDED."status",
  "departmentId" = EXCLUDED."departmentId",
  "updatedAt" = CURRENT_TIMESTAMP,
  "deletedAt" = NULL;

INSERT INTO "UserRole" ("userId", "roleId", "assignedAt", "revokedAt")
VALUES
  ((SELECT "id" FROM "User" WHERE "email" = 'admin@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'ADMIN'), CURRENT_TIMESTAMP, NULL),
  ((SELECT "id" FROM "User" WHERE "email" = 'finance@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'FINANCE'), CURRENT_TIMESTAMP, NULL),
  ((SELECT "id" FROM "User" WHERE "email" = 'manager@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'MANAGER'), CURRENT_TIMESTAMP, NULL),
  ((SELECT "id" FROM "User" WHERE "email" = 'requester@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'REQUESTER'), CURRENT_TIMESTAMP, NULL),
  ((SELECT "id" FROM "User" WHERE "email" = 'purchasing@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'PURCHASING'), CURRENT_TIMESTAMP, NULL),
  ((SELECT "id" FROM "User" WHERE "email" = 'warehouse@procureflow.test'), (SELECT "id" FROM "Role" WHERE "name" = 'WAREHOUSE'), CURRENT_TIMESTAMP, NULL)
ON CONFLICT ("userId", "roleId") DO UPDATE SET
  "revokedAt" = NULL;

UPDATE "Department"
SET "managerId" = (SELECT "id" FROM "User" WHERE "email" = 'manager@procureflow.test'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'IT';

UPDATE "Department"
SET "managerId" = (SELECT "id" FROM "User" WHERE "email" = 'finance@procureflow.test'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'FIN';

UPDATE "Department"
SET "managerId" = (SELECT "id" FROM "User" WHERE "email" = 'purchasing@procureflow.test'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'PUR';

UPDATE "Department"
SET "managerId" = (SELECT "id" FROM "User" WHERE "email" = 'warehouse@procureflow.test'),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "code" = 'WH';
