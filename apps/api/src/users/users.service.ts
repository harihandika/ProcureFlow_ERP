import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const userInclude = {
  department: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  roleAssignments: {
    where: { revokedAt: null },
    include: {
      role: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto, actorId?: string) {
    await this.validateDepartment(dto.departmentId);
    await this.validateRoles(dto.roleIds);
    const roleIds = this.uniqueIds(dto.roleIds);

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        username: dto.username,
        passwordHash,
        fullName: dto.fullName.trim(),
        jobTitle: dto.jobTitle,
        phone: dto.phone,
        status: dto.status ?? UserStatus.ACTIVE,
        departmentId: dto.departmentId,
        roleAssignments: roleIds.length
          ? {
              create: roleIds.map((roleId) => ({
                roleId,
                assignedById: actorId,
              })),
            }
          : undefined,
      },
      include: userInclude,
    });

    return this.sanitize(user);
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const roleName = query.role?.trim().toUpperCase();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(roleName
        ? {
            roleAssignments: {
              some: {
                revokedAt: null,
                role: {
                  name: roleName,
                  deletedAt: null,
                },
              },
            },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { email: { contains: query.search, mode: 'insensitive' } },
              { username: { contains: query.search, mode: 'insensitive' } },
              { fullName: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: userInclude,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return toPaginatedResult(users.map((user) => this.sanitize(user)), total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      include: userInclude,
    });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    await this.findOne(id);
    await this.validateDepartment(dto.departmentId);
    await this.validateRoles(dto.roleIds);
    const roleIds = this.uniqueIds(dto.roleIds);

    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 12) : undefined;

    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: {
          ...(dto.email ? { email: dto.email.toLowerCase() } : {}),
          ...(dto.username !== undefined ? { username: dto.username } : {}),
          ...(passwordHash ? { passwordHash } : {}),
          ...(dto.fullName ? { fullName: dto.fullName.trim() } : {}),
          ...(dto.jobTitle !== undefined ? { jobTitle: dto.jobTitle } : {}),
          ...(dto.phone !== undefined ? { phone: dto.phone } : {}),
          ...(dto.status ? { status: dto.status } : {}),
          ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        },
        include: userInclude,
      });

      if (dto.roleIds) {
        await tx.userRole.updateMany({
          where: {
            userId: id,
            roleId: { notIn: roleIds },
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });

        for (const roleId of roleIds) {
          await tx.userRole.upsert({
            where: {
              userId_roleId: {
                userId: id,
                roleId,
              },
            },
            update: {
              revokedAt: null,
              assignedById: actorId,
              assignedAt: new Date(),
            },
            create: {
              userId: id,
              roleId,
              assignedById: actorId,
            },
          });
        }
      }

      return tx.user.findUniqueOrThrow({
        where: { id: updated.id },
        include: userInclude,
      });
    });

    return this.sanitize(user);
  }

  async remove(id: string) {
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        status: UserStatus.DISABLED,
        deletedAt: new Date(),
      },
      include: userInclude,
    });

    return this.sanitize(user);
  }

  private async validateDepartment(departmentId?: string) {
    if (!departmentId) {
      return;
    }

    const department = await this.prisma.department.findFirst({
      where: {
        id: departmentId,
        deletedAt: null,
      },
    });

    if (!department) {
      throw new BadRequestException('Department does not exist.');
    }
  }

  private async validateRoles(roleIds?: string[]) {
    if (!roleIds?.length) {
      return;
    }

    const uniqueRoleIds = [...new Set(roleIds)];
    const count = await this.prisma.role.count({
      where: {
        id: { in: uniqueRoleIds },
        deletedAt: null,
      },
    });

    if (count !== uniqueRoleIds.length) {
      throw new BadRequestException('One or more roles do not exist.');
    }
  }

  private uniqueIds(ids?: string[]) {
    return [...new Set(ids ?? [])];
  }

  private sanitize(user: UserWithRelations) {
    const { passwordHash: _passwordHash, roleAssignments, ...safeUser } = user;

    return {
      ...safeUser,
      roles: roleAssignments.map((assignment) => assignment.role),
    };
  }
}
