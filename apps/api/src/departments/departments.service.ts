import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

const departmentInclude = {
  manager: {
    select: {
      id: true,
      email: true,
      fullName: true,
    },
  },
  parent: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.DepartmentInclude;

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDepartmentDto) {
    await this.validateReferences(dto.managerId, dto.parentId);

    return this.prisma.department.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description,
        isActive: dto.isActive ?? true,
        managerId: dto.managerId,
        parentId: dto.parentId,
      },
      include: departmentInclude,
    });
  }

  async findAll(query: DepartmentQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.DepartmentWhereInput = {
      deletedAt: null,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.parentId ? { parentId: query.parentId } : {}),
      ...(query.search
        ? {
            OR: [
              { code: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.department.findMany({
        where,
        include: departmentInclude,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.department.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const department = await this.prisma.department.findFirst({
      where: { id, deletedAt: null },
      include: departmentInclude,
    });

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    return department;
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    await this.validateReferences(dto.managerId, dto.parentId);

    if (dto.parentId === id) {
      throw new BadRequestException('A department cannot be its own parent.');
    }

    return this.prisma.department.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.managerId !== undefined ? { managerId: dto.managerId } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
      },
      include: departmentInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.department.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: departmentInclude,
    });
  }

  private async validateReferences(managerId?: string, parentId?: string) {
    if (managerId) {
      const manager = await this.prisma.user.findFirst({
        where: { id: managerId, deletedAt: null },
      });

      if (!manager) {
        throw new BadRequestException('Manager user does not exist.');
      }
    }

    if (parentId) {
      const parent = await this.prisma.department.findFirst({
        where: { id: parentId, deletedAt: null },
      });

      if (!parent) {
        throw new BadRequestException('Parent department does not exist.');
      }
    }
  }
}
