import {
  AuditAction,
  AuditEntityType,
  BudgetStatus,
  BudgetTransactionStatus,
  BudgetTransactionType,
  Prisma,
  PurchaseOrderStatus,
  PurchaseRequestPriority,
  PurchaseRequestStatus,
  ReceivingStatus,
  UserStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AppRole } from '../../src/common/constants/roles';

type EntityName =
  | 'auditTrail'
  | 'budget'
  | 'budgetTransaction'
  | 'department'
  | 'erpSyncLog'
  | 'item'
  | 'packagingUnit'
  | 'purchaseOrder'
  | 'purchaseOrderItem'
  | 'purchaseRequest'
  | 'purchaseRequestItem'
  | 'receiving'
  | 'receivingItem'
  | 'role'
  | 'supplier'
  | 'user'
  | 'warehouse';

type RecordData = Record<string, any>;

function createId(sequence: number) {
  return `10000000-0000-4000-8000-${sequence.toString(16).padStart(12, '0')}`;
}

function decimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function toArray<T>(value?: T | T[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export class WorkflowPrisma {
  private sequence = 1;
  private data: Record<EntityName, RecordData[]> = {
    auditTrail: [],
    budget: [],
    budgetTransaction: [],
    department: [],
    erpSyncLog: [],
    item: [],
    packagingUnit: [],
    purchaseOrder: [],
    purchaseOrderItem: [],
    purchaseRequest: [],
    purchaseRequestItem: [],
    receiving: [],
    receivingItem: [],
    role: [],
    supplier: [],
    user: [],
    warehouse: [],
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
    afterCreate: (record, data) => {
      for (const assignment of data.roleAssignments?.create ?? []) {
        record.roleAssignments.push({
          userId: record.id,
          roleId: assignment.roleId,
          assignedById: assignment.assignedById ?? null,
          assignedAt: new Date(),
          revokedAt: null,
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

  readonly packagingUnit = this.createDelegate('packagingUnit', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isActive: data.isActive ?? true,
    }),
  });

  readonly item = this.createDelegate('item', {
    defaults: (data) => ({
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      category: data.category ?? null,
      brand: data.brand ?? null,
      estimatedUnitPrice: decimal(data.estimatedUnitPrice ?? 0),
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

  readonly budget = this.createDelegate('budget', {
    defaults: (data) => ({
      code: data.code,
      name: data.name,
      fiscalYear: data.fiscalYear,
      period: data.period ?? null,
      currency: data.currency ?? 'IDR',
      status: data.status ?? BudgetStatus.ACTIVE,
      description: data.description ?? null,
      allocatedAmount: decimal(data.allocatedAmount ?? 0),
      reservedAmount: decimal(data.reservedAmount ?? 0),
      committedAmount: decimal(data.committedAmount ?? 0),
      consumedAmount: decimal(data.consumedAmount ?? 0),
      departmentId: data.departmentId,
      createdById: data.createdById ?? null,
      approvedById: data.approvedById ?? null,
      approvedAt: data.approvedAt ?? null,
    }),
  });

  readonly budgetTransaction = this.createDelegate('budgetTransaction', {
    defaults: (data) => ({
      transactionNo: data.transactionNo,
      type: data.type ?? BudgetTransactionType.ALLOCATION,
      status: data.status ?? BudgetTransactionStatus.POSTED,
      amount: decimal(data.amount ?? 0),
      currency: data.currency ?? 'IDR',
      description: data.description ?? null,
      occurredAt: data.occurredAt ?? new Date(),
      budgetId: data.budgetId,
      purchaseRequestId: data.purchaseRequestId ?? null,
      createdById: data.createdById ?? null,
    }),
  });

  readonly purchaseRequest = this.createDelegate('purchaseRequest', {
    defaults: (data) => ({
      requestNumber: data.requestNumber,
      title: data.title,
      description: data.description ?? null,
      status: data.status ?? PurchaseRequestStatus.DRAFT,
      priority: data.priority ?? PurchaseRequestPriority.NORMAL,
      requiredDate: data.requiredDate ?? null,
      submittedAt: data.submittedAt ?? null,
      cancelledAt: data.cancelledAt ?? null,
      totalAmount: decimal(data.totalAmount ?? 0),
      currency: data.currency ?? 'IDR',
      requesterId: data.requesterId,
      departmentId: data.departmentId,
      budgetId: data.budgetId ?? null,
    }),
    afterCreate: (record, data) => {
      for (const item of data.items?.create ?? []) {
        this.createChild('purchaseRequestItem', {
          ...item,
          purchaseRequestId: record.id,
        });
      }
    },
  });

  readonly purchaseRequestItem = {
    ...this.createDelegate('purchaseRequestItem', {
      defaults: (data) => ({
        description: data.description ?? null,
        notes: data.notes ?? null,
        quantity: decimal(data.quantity),
        estimatedUnitPrice: decimal(data.estimatedUnitPrice),
        lineTotal: decimal(data.lineTotal),
        itemSkuSnapshot: data.itemSkuSnapshot,
        itemNameSnapshot: data.itemNameSnapshot,
        unitCodeSnapshot: data.unitCodeSnapshot,
        unitNameSnapshot: data.unitNameSnapshot,
        purchaseRequestId: data.purchaseRequestId,
        itemId: data.itemId,
        packagingUnitId: data.packagingUnitId,
      }),
    }),
    deleteMany: jest.fn(async ({ where }: { where: RecordData }) => {
      const before = this.data.purchaseRequestItem.length;
      this.data.purchaseRequestItem = this.data.purchaseRequestItem.filter((item) => item.purchaseRequestId !== where.purchaseRequestId);

      return { count: before - this.data.purchaseRequestItem.length };
    }),
    createMany: jest.fn(async ({ data }: { data: RecordData[] }) => {
      for (const item of data) {
        this.createChild('purchaseRequestItem', item);
      }

      return { count: data.length };
    }),
  };

  readonly purchaseOrder = this.createDelegate('purchaseOrder', {
    defaults: (data) => ({
      poNumber: data.poNumber,
      status: data.status ?? PurchaseOrderStatus.DRAFT,
      issueDate: data.issueDate ?? null,
      expectedDeliveryDate: data.expectedDeliveryDate ?? null,
      totalAmount: decimal(data.totalAmount ?? 0),
      currency: data.currency ?? 'IDR',
      erpExternalId: data.erpExternalId ?? null,
      syncedAt: data.syncedAt ?? null,
      notes: data.notes ?? null,
      purchaseRequestId: data.purchaseRequestId ?? null,
      supplierId: data.supplierId,
      warehouseId: data.warehouseId,
      createdById: data.createdById ?? null,
    }),
    afterCreate: (record, data) => {
      for (const item of data.items?.create ?? []) {
        this.createChild('purchaseOrderItem', {
          ...item,
          quantityOrdered: decimal(item.quantityOrdered),
          quantityReceived: decimal(item.quantityReceived ?? 0),
          unitPrice: decimal(item.unitPrice),
          lineTotal: decimal(item.lineTotal),
          purchaseOrderId: record.id,
        });
      }
    },
  });

  readonly purchaseOrderItem = this.createDelegate('purchaseOrderItem', {
    defaults: (data) => ({
      description: data.description ?? null,
      quantityOrdered: decimal(data.quantityOrdered),
      quantityReceived: decimal(data.quantityReceived ?? 0),
      unitPrice: decimal(data.unitPrice),
      lineTotal: decimal(data.lineTotal),
      itemSkuSnapshot: data.itemSkuSnapshot,
      itemNameSnapshot: data.itemNameSnapshot,
      unitCodeSnapshot: data.unitCodeSnapshot,
      unitNameSnapshot: data.unitNameSnapshot,
      purchaseOrderId: data.purchaseOrderId,
      purchaseRequestItemId: data.purchaseRequestItemId ?? null,
      itemId: data.itemId,
      packagingUnitId: data.packagingUnitId,
    }),
  });

  readonly receiving = this.createDelegate('receiving', {
    defaults: (data) => ({
      receivingNumber: data.receivingNumber,
      status: data.status ?? ReceivingStatus.PARTIAL,
      receivedAt: data.receivedAt ?? new Date(),
      deliveryNoteNo: data.deliveryNoteNo ?? null,
      remarks: data.remarks ?? null,
      purchaseOrderId: data.purchaseOrderId,
      warehouseId: data.warehouseId,
      receivedById: data.receivedById ?? null,
    }),
    afterCreate: (record, data) => {
      for (const item of data.items?.create ?? []) {
        this.createChild('receivingItem', {
          ...item,
          receivingId: record.id,
        });
      }
    },
  });

  readonly receivingItem = this.createDelegate('receivingItem', {
    defaults: (data) => ({
      scannedCode: data.scannedCode ?? null,
      quantityReceived: decimal(data.quantityReceived),
      quantityAccepted: decimal(data.quantityAccepted ?? 0),
      quantityRejected: decimal(data.quantityRejected ?? 0),
      remarks: data.remarks ?? null,
      receivingId: data.receivingId,
      purchaseOrderItemId: data.purchaseOrderItemId,
      itemId: data.itemId,
    }),
  });

  readonly auditTrail = {
    ...this.createDelegate('auditTrail', {
      defaults: (data) => ({
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        entityLabel: data.entityLabel ?? null,
        before: data.before ?? null,
        after: data.after ?? null,
        metadata: data.metadata ?? null,
        ipAddress: data.ipAddress ?? null,
        userAgent: data.userAgent ?? null,
        actorId: data.actorId ?? null,
      }),
    }),
    findUnique: jest.fn(async ({ where }: { where: RecordData }) => this.withRelations('auditTrail', this.findById('auditTrail', where.id))),
  };

  readonly erpSyncLog = {
    ...this.createDelegate('erpSyncLog', {
      defaults: (data) => ({
        operation: data.operation,
        status: data.status,
        attemptNo: data.attemptNo ?? 1,
        maxAttempts: data.maxAttempts ?? 3,
        externalId: data.externalId ?? null,
        requestPayload: data.requestPayload ?? null,
        responsePayload: data.responsePayload ?? null,
        errorMessage: data.errorMessage ?? null,
        syncedAt: data.syncedAt ?? null,
        nextRetryAt: data.nextRetryAt ?? null,
        purchaseOrderId: data.purchaseOrderId,
        triggeredById: data.triggeredById ?? null,
        previousSyncLogId: data.previousSyncLogId ?? null,
      }),
    }),
    aggregate: jest.fn(async ({ where }: { where?: RecordData }) => {
      const records = this.filter('erpSyncLog', where);
      const maxAttemptNo = records.reduce<number | null>((max, record) => {
        const attemptNo = Number(record.attemptNo ?? 0);
        return max === null || attemptNo > max ? attemptNo : max;
      }, null);

      return {
        _max: {
          attemptNo: maxAttemptNo,
        },
      };
    }),
  };

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

  async seedWorkflowData() {
    const roles = new Map<AppRole, RecordData>();

    for (const roleName of Object.values(AppRole)) {
      roles.set(roleName, await this.role.create({ data: { name: roleName, isSystem: true } }));
    }

    const department = await this.department.create({
      data: { code: 'IT', name: 'Information Technology', isActive: true },
    });
    const passwordHash = await bcrypt.hash('Password123!', 4);

    const admin = await this.createSeedUser('admin@procureflow.test', 'Alya Admin', passwordHash, roles.get(AppRole.Admin)!.id);
    const finance = await this.createSeedUser('finance@procureflow.test', 'Faris Finance', passwordHash, roles.get(AppRole.Finance)!.id);
    const requester = await this.createSeedUser(
      'requester@procureflow.test',
      'Rina Requester',
      passwordHash,
      roles.get(AppRole.Requester)!.id,
      department.id,
    );
    const manager = await this.createSeedUser(
      'manager@procureflow.test',
      'Maya Manager',
      passwordHash,
      roles.get(AppRole.Manager)!.id,
      department.id,
    );
    const purchasing = await this.createSeedUser(
      'purchasing@procureflow.test',
      'Pandu Purchasing',
      passwordHash,
      roles.get(AppRole.Purchasing)!.id,
    );
    const warehouseUser = await this.createSeedUser(
      'warehouse@procureflow.test',
      'Wahyu Warehouse',
      passwordHash,
      roles.get(AppRole.Warehouse)!.id,
    );

    await this.department.update({ where: { id: department.id }, data: { managerId: manager.id } });

    const unit = await this.packagingUnit.create({ data: { code: 'PCS', name: 'Piece', isActive: true } });
    const item = await this.item.create({
      data: {
        sku: 'LAPTOP-STD-001',
        name: 'Standard Business Laptop',
        category: 'IT Equipment',
        estimatedUnitPrice: 100,
        defaultPackagingUnitId: unit.id,
        isActive: true,
      },
    });
    const secondItem = await this.item.create({
      data: {
        sku: 'MOUSE-WL-001',
        name: 'Wireless Mouse',
        category: 'IT Equipment',
        estimatedUnitPrice: 50,
        defaultPackagingUnitId: unit.id,
        isActive: true,
      },
    });
    const supplier = await this.supplier.create({ data: { code: 'SUP-001', name: 'PT Test Supplier', isActive: true } });
    const warehouse = await this.warehouse.create({ data: { code: 'WH-MAIN', name: 'Main Warehouse', isActive: true } });

    return {
      roles,
      users: { admin, finance, requester, manager, purchasing, warehouse: warehouseUser },
      department,
      unit,
      item,
      secondItem,
      supplier,
      warehouse,
      password: 'Password123!',
    };
  }

  private async createSeedUser(email: string, fullName: string, passwordHash: string, roleId: string, departmentId?: string) {
    return this.user.create({
      data: {
        email,
        username: email.split('@')[0],
        passwordHash,
        fullName,
        departmentId,
        status: UserStatus.ACTIVE,
        roleAssignments: { create: [{ roleId }] },
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
        const record = this.createChild(name, options.defaults(data));
        options.afterCreate?.(record, data);

        return this.withRelations(name, record);
      }),
      findFirst: jest.fn(async (args?: { where?: RecordData }) => {
        const record = this.filter(name, args?.where)[0] ?? null;

        return record ? this.withRelations(name, record) : null;
      }),
      findMany: jest.fn(async (args?: { where?: RecordData; skip?: number; take?: number }) => {
        const filtered = this.filter(name, args?.where);
        const skip = args?.skip ?? 0;
        const take = args?.take ?? filtered.length;

        return filtered.slice(skip, skip + take).map((record) => this.withRelations(name, record));
      }),
      findUniqueOrThrow: jest.fn(async ({ where }: { where: RecordData }) => this.withRelations(name, this.findById(name, where.id))),
      findUnique: jest.fn(async ({ where }: { where: RecordData }) => {
        const record = this.data[name].find((item) => item.id === where.id) ?? null;

        return record ? this.withRelations(name, record) : null;
      }),
      count: jest.fn(async ({ where }: { where?: RecordData } = {}) => this.filter(name, where).length),
      update: jest.fn(async ({ where, data }: { where: RecordData; data: RecordData }) => {
        const record = this.findById(name, where.id);
        Object.assign(record, data, { updatedAt: new Date() });

        return this.withRelations(name, record);
      }),
    };
  }

  private createChild(name: EntityName, data: RecordData) {
    const now = new Date();
    const record = {
      id: this.nextId(),
      ...data,
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      deletedAt: data.deletedAt ?? null,
    };

    this.data[name].push(record);
    return record;
  }

  private nextId() {
    return createId(this.sequence++);
  }

  private findById(name: EntityName, id: string) {
    const record = this.data[name].find((item) => item.id === id);

    if (!record) {
      throw new Error(`${name} not found in workflow test data.`);
    }

    return record;
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

      if (where.id?.not && record.id === where.id.not) {
        return false;
      }

      for (const field of [
        'action',
        'actorId',
        'budgetId',
        'departmentId',
        'email',
        'entityId',
        'entityType',
        'fiscalYear',
        'itemId',
        'operation',
        'packagingUnitId',
        'period',
        'previousSyncLogId',
        'purchaseOrderId',
        'purchaseRequestId',
        'requesterId',
        'status',
        'supplierId',
        'warehouseId',
      ]) {
        if (where[field] !== undefined && !this.matchesValue(record[field], where[field])) {
          return false;
        }
      }

      if (where.deletedAt === null && record.deletedAt !== null) {
        return false;
      }

      if (where.isActive !== undefined && record.isActive !== where.isActive) {
        return false;
      }

      if (where.roleAssignments?.some?.role?.name && !this.hasRole(record, where.roleAssignments.some.role.name)) {
        return false;
      }

      if (where.entityId?.in && !where.entityId.in.includes(record.entityId)) {
        return false;
      }

      return true;
    });
  }

  private matchesValue(recordValue: unknown, whereValue: unknown) {
    if (whereValue && typeof whereValue === 'object' && 'in' in whereValue) {
      return (whereValue as { in: unknown[] }).in.includes(recordValue);
    }

    return recordValue === whereValue;
  }

  private hasRole(user: RecordData, roleName: string) {
    return user.roleAssignments.some((assignment: RecordData) => {
      const role = this.findById('role', assignment.roleId);

      return assignment.revokedAt === null && role.name === roleName;
    });
  }

  private withRelations(name: EntityName, record: RecordData): RecordData {
    if (name === 'user') {
      return {
        ...record,
        department: record.departmentId ? this.findById('department', record.departmentId) : null,
        roleAssignments: record.roleAssignments.map((assignment: RecordData) => ({
          ...assignment,
          role: this.findById('role', assignment.roleId),
        })),
      };
    }

    if (name === 'budget') {
      return {
        ...record,
        department: this.findById('department', record.departmentId),
        createdBy: record.createdById ? this.userSummary(record.createdById) : null,
        approvedBy: record.approvedById ? this.userSummary(record.approvedById) : null,
      };
    }

    if (name === 'purchaseRequest') {
      return {
        ...record,
        requester: this.userSummary(record.requesterId),
        department: this.findById('department', record.departmentId),
        budget: record.budgetId ? this.findById('budget', record.budgetId) : null,
        items: this.data.purchaseRequestItem
          .filter((item) => item.purchaseRequestId === record.id)
          .map((item) => this.withRelations('purchaseRequestItem', item)),
      };
    }

    if (name === 'purchaseRequestItem') {
      return {
        ...record,
        item: this.findById('item', record.itemId),
        packagingUnit: this.findById('packagingUnit', record.packagingUnitId),
      };
    }

    if (name === 'purchaseOrder') {
      return {
        ...record,
        purchaseRequest: record.purchaseRequestId ? this.withRelations('purchaseRequest', this.findById('purchaseRequest', record.purchaseRequestId)) : null,
        supplier: this.findById('supplier', record.supplierId),
        warehouse: this.findById('warehouse', record.warehouseId),
        createdBy: record.createdById ? this.userSummary(record.createdById) : null,
        items: this.data.purchaseOrderItem
          .filter((item) => item.purchaseOrderId === record.id)
          .map((item) => this.withRelations('purchaseOrderItem', item)),
        erpSyncLogs: [],
      };
    }

    if (name === 'purchaseOrderItem') {
      return {
        ...record,
        item: this.findById('item', record.itemId),
        packagingUnit: this.findById('packagingUnit', record.packagingUnitId),
      };
    }

    if (name === 'receiving') {
      return {
        ...record,
        purchaseOrder: this.withRelations('purchaseOrder', this.findById('purchaseOrder', record.purchaseOrderId)),
        warehouse: this.findById('warehouse', record.warehouseId),
        receivedBy: record.receivedById ? this.userSummary(record.receivedById) : null,
        items: this.data.receivingItem
          .filter((item) => item.receivingId === record.id)
          .map((item) => this.withRelations('receivingItem', item)),
      };
    }

    if (name === 'receivingItem') {
      return {
        ...record,
        item: this.findById('item', record.itemId),
        purchaseOrderItem: this.withRelations('purchaseOrderItem', this.findById('purchaseOrderItem', record.purchaseOrderItemId)),
      };
    }

    if (name === 'auditTrail') {
      return {
        ...record,
        actor: record.actorId ? this.userSummary(record.actorId) : null,
      };
    }

    if (name === 'erpSyncLog') {
      return {
        ...record,
        purchaseOrder: this.withRelations('purchaseOrder', this.findById('purchaseOrder', record.purchaseOrderId)),
        triggeredBy: record.triggeredById ? this.userSummary(record.triggeredById) : null,
      };
    }

    return record;
  }

  private userSummary(id: string) {
    const user = this.findById('user', id);

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
    };
  }
}

export function money(value: unknown) {
  return Number(value);
}
