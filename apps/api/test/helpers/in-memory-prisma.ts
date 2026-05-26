import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../src/common/constants/roles';

type EntityName =
  | 'department'
  | 'item'
  | 'packagingUnit'
  | 'role'
  | 'supplier'
  | 'user'
  | 'warehouse';

type RecordData = Record<string, any>;

const searchableFields: Record<EntityName, string[]> = {
  department: ['code', 'name', 'description'],
  item: ['sku', 'name', 'description', 'category', 'brand'],
  packagingUnit: ['code', 'name', 'description'],
  role: ['name', 'description'],
  supplier: ['code', 'name', 'contactName', 'email', 'city'],
  user: ['email', 'username', 'fullName'],
  warehouse: ['code', 'name', 'description', 'address'],
};

function createId(sequence: number) {
  return `00000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`;
}

function normalizeString(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function matchesSearch(record: RecordData, fields: string[], search?: string) {
  if (!search) {
    return true;
  }

  const keyword = normalizeString(search);
  return fields.some((field) => normalizeString(record[field]).includes(keyword));
}

function applyPagination(records: RecordData[], args?: { skip?: number; take?: number }) {
  const skip = args?.skip ?? 0;
  const take = args?.take ?? records.length;

  return records.slice(skip, skip + take);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export class InMemoryPrisma {
  private sequence = 1;
  private data: Record<EntityName, RecordData[]> = {
    department: [],
    item: [],
    packagingUnit: [],
    role: [],
    supplier: [],
    user: [],
    warehouse: [],
  };

  readonly auditTrail = {
    create: jest.fn(async ({ data }: { data: RecordData }) => ({
      id: this.nextId('audit'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  };

  readonly userRole = {
    upsert: jest.fn(async ({ where, update, create }: { where: RecordData; update: RecordData; create: RecordData }) => {
      const key = where.userId_roleId;
      const user = this.findById('user', key.userId);
      const role = this.findById('role', key.roleId);
      const existing = user.roleAssignments.find((assignment: RecordData) => assignment.roleId === key.roleId);

      if (existing) {
        Object.assign(existing, update);
      } else {
        user.roleAssignments.push({
          userId: key.userId,
          roleId: key.roleId,
          assignedById: create.assignedById,
          assignedAt: new Date(),
          revokedAt: null,
          role,
        });
      }

      return clone(existing ?? user.roleAssignments.at(-1));
    }),
    updateMany: jest.fn(async ({ where, data }: { where: RecordData; data: RecordData }) => {
      const user = this.findById('user', where.userId);
      let count = 0;

      for (const assignment of user.roleAssignments) {
        const notIn = where.roleId?.notIn ?? [];
        const shouldUpdate = !notIn.includes(assignment.roleId) && assignment.revokedAt === where.revokedAt;

        if (shouldUpdate) {
          Object.assign(assignment, data);
          count += 1;
        }
      }

      return { count };
    }),
  };

  readonly role = this.createDelegate('role', {
    defaults: (data) => ({
      name: data.name,
      description: data.description ?? null,
      isSystem: data.isSystem ?? false,
    }),
  });

  readonly user = this.createDelegate('user', {
    defaults: (data) => ({
      email: data.email,
      username: data.username ?? null,
      passwordHash: data.passwordHash,
      fullName: data.fullName,
      jobTitle: data.jobTitle ?? null,
      phone: data.phone ?? null,
      status: data.status ?? UserStatus.ACTIVE,
      lastLoginAt: data.lastLoginAt ?? null,
      departmentId: data.departmentId ?? null,
      roleAssignments: [],
    }),
    afterCreate: (user, data) => {
      for (const assignment of data.roleAssignments?.create ?? []) {
        const role = this.findById('role', assignment.roleId);
        user.roleAssignments.push({
          userId: user.id,
          roleId: assignment.roleId,
          assignedById: assignment.assignedById ?? null,
          assignedAt: new Date(),
          revokedAt: null,
          role,
        });
      }
    },
  });

  readonly department = this.createDelegate('department', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
      managerId: data.managerId ?? null,
      parentId: data.parentId ?? null,
    }),
  });

  readonly item = this.createDelegate('item', {
    defaults: (data) => ({
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      brand: data.brand ?? null,
      estimatedUnitPrice: data.estimatedUnitPrice ?? 0,
      defaultPackagingUnitId: data.defaultPackagingUnitId ?? null,
      defaultSupplierId: data.defaultSupplierId ?? null,
      isActive: data.isActive ?? true,
    }),
  });

  readonly supplier = this.createDelegate('supplier', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      contactName: data.contactName ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      taxNumber: data.taxNumber ?? null,
      addressLine1: data.addressLine1 ?? null,
      addressLine2: data.addressLine2 ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      paymentTerms: data.paymentTerms ?? null,
      isActive: data.isActive ?? true,
    }),
  });

  readonly warehouse = this.createDelegate('warehouse', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      address: data.address ?? null,
      isActive: data.isActive ?? true,
    }),
  });

  readonly packagingUnit = this.createDelegate('packagingUnit', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
    }),
  });

  async $connect() {
    return undefined;
  }

  async $disconnect() {
    return undefined;
  }

  async $transaction(input: any) {
    if (Array.isArray(input)) {
      return Promise.all(input);
    }

    return input(this);
  }

  async seedAuthUsers() {
    const roles = new Map<AppRole, RecordData>();

    for (const roleName of Object.values(AppRole)) {
      roles.set(
        roleName,
        await this.role.create({
          data: {
            name: roleName,
            description: `${roleName} test role`,
            isSystem: true,
          },
        }),
      );
    }

    const passwordHash = await bcrypt.hash('Password123!', 4);
    const admin = await this.createSeedUser('admin@procureflow.test', 'Alya Admin', passwordHash, roles.get(AppRole.Admin)!.id);
    const requester = await this.createSeedUser(
      'requester@procureflow.test',
      'Rina Requester',
      passwordHash,
      roles.get(AppRole.Requester)!.id,
    );
    const purchasing = await this.createSeedUser(
      'purchasing@procureflow.test',
      'Pandu Purchasing',
      passwordHash,
      roles.get(AppRole.Purchasing)!.id,
    );

    return { roles, users: { admin, requester, purchasing }, password: 'Password123!' };
  }

  private async createSeedUser(email: string, fullName: string, passwordHash: string, roleId: string) {
    return this.user.create({
      data: {
        email,
        username: email.split('@')[0],
        passwordHash,
        fullName,
        status: UserStatus.ACTIVE,
        roleAssignments: {
          create: [{ roleId }],
        },
      },
    });
  }

  private createDelegate(
    name: EntityName,
    options: {
      defaults: (data: RecordData) => RecordData;
      afterCreate?: (record: RecordData, data: RecordData) => void;
    },
  ): any {
    return {
      create: jest.fn(async ({ data }: { data: RecordData }) => {
        const now = new Date();
        const record = {
          id: this.nextId(name),
          ...options.defaults(data),
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        };

        options.afterCreate?.(record, data);
        this.data[name].push(record);

        return clone(this.withRelations(name, record));
      }),
      findFirst: jest.fn(async (args?: { where?: RecordData }) => clone(this.findFirst(name, args?.where) ?? null)),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: RecordData }) => clone(this.findById(name, where.id))),
      findMany: jest.fn(async (args?: { where?: RecordData; skip?: number; take?: number }) => {
        const records = this.filter(name, args?.where);

        return clone(applyPagination(records, args).map((record) => this.withRelations(name, record)));
      }),
      count: jest.fn(async ({ where }: { where?: RecordData } = {}) => this.filter(name, where).length),
      update: jest.fn(async ({ where, data }: { where: RecordData; data: RecordData }) => {
        const record = this.findById(name, where.id);
        Object.assign(record, data, { updatedAt: new Date() });

        return clone(this.withRelations(name, record));
      }),
      upsert: jest.fn(async ({ where, update, create }: { where: RecordData; update: RecordData; create: RecordData }) => {
        const record = this.findByUnique(name, where);

        if (record) {
          Object.assign(record, update, { updatedAt: new Date() });
          return clone(this.withRelations(name, record));
        }

        return this.createDelegate(name, options).create({ data: create });
      }),
    };
  }

  private nextId(prefix: string) {
    return createId(this.sequence++);
  }

  private findById(name: EntityName, id: string) {
    const record = this.data[name].find((item) => item.id === id);

    if (!record) {
      throw new Error(`${name} not found in test data.`);
    }

    return record;
  }

  private findByUnique(name: EntityName, where: RecordData) {
    const [field, value] = Object.entries(where)[0] ?? [];

    return this.data[name].find((record) => record[field] === value) ?? null;
  }

  private findFirst(name: EntityName, where?: RecordData) {
    return this.filter(name, where)[0] ?? null;
  }

  private filter(name: EntityName, where?: RecordData) {
    return this.data[name].filter((record) => {
      if (!where) {
        return true;
      }

      if (typeof where.id === 'string' && record.id !== where.id) {
        return false;
      }

      if (where.id?.in && !where.id.in.includes(record.id)) {
        return false;
      }

      if (where.email && record.email !== where.email) {
        return false;
      }

      if (where.status && record.status !== where.status) {
        return false;
      }

      if (where.deletedAt === null && record.deletedAt !== null) {
        return false;
      }

      if (where.isActive !== undefined && record.isActive !== where.isActive) {
        return false;
      }

      if (where.parentId && record.parentId !== where.parentId) {
        return false;
      }

      if (where.category?.equals && normalizeString(record.category) !== normalizeString(where.category.equals)) {
        return false;
      }

      if (where.defaultSupplierId && record.defaultSupplierId !== where.defaultSupplierId) {
        return false;
      }

      if (where.defaultPackagingUnitId && record.defaultPackagingUnitId !== where.defaultPackagingUnitId) {
        return false;
      }

      if (where.roleAssignments?.some?.role?.name && !this.hasRole(record, where.roleAssignments.some.role.name)) {
        return false;
      }

      const searchCondition = where.OR?.[0] ? (Object.values(where.OR[0])[0] as { contains?: string } | undefined) : undefined;
      const search = searchCondition?.contains;

      return matchesSearch(record, searchableFields[name], search);
    });
  }

  private hasRole(user: RecordData, roleName: string) {
    return user.roleAssignments.some((assignment: RecordData) => assignment.revokedAt === null && assignment.role.name === roleName);
  }

  private withRelations(name: EntityName, record: RecordData) {
    if (name === 'user') {
      return {
        ...record,
        department: record.departmentId ? this.data.department.find((department) => department.id === record.departmentId) : null,
        roleAssignments: record.roleAssignments.map((assignment: RecordData) => ({
          ...assignment,
          role: this.findById('role', assignment.roleId),
        })),
      };
    }

    if (name === 'item') {
      return {
        ...record,
        defaultPackagingUnit: record.defaultPackagingUnitId
          ? this.data.packagingUnit.find((unit) => unit.id === record.defaultPackagingUnitId)
          : null,
        defaultSupplier: record.defaultSupplierId ? this.data.supplier.find((supplier) => supplier.id === record.defaultSupplierId) : null,
      };
    }

    if (name === 'department') {
      return {
        ...record,
        manager: record.managerId ? this.data.user.find((user) => user.id === record.managerId) : null,
        parent: record.parentId ? this.data.department.find((department) => department.id === record.parentId) : null,
      };
    }

    return record;
  }
}
