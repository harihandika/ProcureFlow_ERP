import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto';
import { PackagingUnitQueryDto } from './dto/packaging-unit-query.dto';
import { UpdatePackagingUnitDto } from './dto/update-packaging-unit.dto';

@Injectable()
export class PackagingUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreatePackagingUnitDto) {
    return this.prisma.packagingUnit.create({
      data: {
        code: dto.code.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(query: PackagingUnitQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.PackagingUnitWhereInput = {
      deletedAt: null,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
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
      this.prisma.packagingUnit.findMany({
        where,
        skip,
        take,
        orderBy: { code: 'asc' },
      }),
      this.prisma.packagingUnit.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const unit = await this.prisma.packagingUnit.findFirst({
      where: { id, deletedAt: null },
    });

    if (!unit) {
      throw new NotFoundException('Packaging unit not found.');
    }

    return unit;
  }

  async update(id: string, dto: UpdatePackagingUnitDto) {
    await this.findOne(id);

    return this.prisma.packagingUnit.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.packagingUnit.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }
}
