import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RoleQueryDto } from './dto/role-query.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRoleDto) {
    const role = await this.prisma.role.create({
      data: {
        name: dto.name.trim().toUpperCase(),
        description: dto.description,
        isSystem: dto.isSystem ?? false,
      },
    });

    return role;
  }

  async findAll(query: RoleQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.RoleWhereInput = {
      deletedAt: null,
      ...(query.isSystem === undefined ? {} : { isSystem: query.isSystem }),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.role.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findFirst({
      where: { id, deletedAt: null },
    });

    if (!role) {
      throw new NotFoundException('Role not found.');
    }

    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    return this.prisma.role.update({
      where: { id },
      data: {
        ...(dto.name ? { name: dto.name.trim().toUpperCase() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isSystem !== undefined ? { isSystem: dto.isSystem } : {}),
      },
    });
  }

  async remove(id: string) {
    const role = await this.findOne(id);

    if (role.isSystem) {
      throw new BadRequestException('System roles cannot be deleted.');
    }

    return this.prisma.role.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
