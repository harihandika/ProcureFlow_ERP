import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditEntityType, Prisma } from '@prisma/client';
import { AuditTrailQueryDto } from './dto/audit-trail-query.dto';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

interface RecordAuditInput {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId?: string;
  entityLabel?: string;
  actorId?: string;
  before?: unknown;
  after?: unknown;
  metadata?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

const auditTrailInclude = {
  actor: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
} satisfies Prisma.AuditTrailInclude;

@Injectable()
export class AuditTrailsService {
  private readonly logger = new Logger(AuditTrailsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput) {
    try {
      return await this.prisma.auditTrail.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          entityLabel: input.entityLabel,
          actorId: input.actorId,
          before: this.toJson(input.before),
          after: this.toJson(input.after),
          metadata: this.toJson(input.metadata),
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
      });
    } catch (error) {
      this.logger.warn(`Audit write failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  async findAll(query: AuditTrailQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.AuditTrailWhereInput = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.search
        ? {
            OR: [
              { entityLabel: { contains: query.search, mode: 'insensitive' } },
              { actor: { email: { contains: query.search, mode: 'insensitive' } } },
              { actor: { fullName: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditTrail.findMany({
        where,
        include: auditTrailInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditTrail.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const auditTrail = await this.prisma.auditTrail.findUnique({
      where: { id },
      include: auditTrailInclude,
    });

    if (!auditTrail) {
      throw new NotFoundException('Audit trail record not found.');
    }

    return auditTrail;
  }

  private toJson(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }
}
