import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, toPaginatedResult } from '../common/utils/pagination.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { ItemQueryDto } from './dto/item-query.dto';
import { UpdateItemDto } from './dto/update-item.dto';

const itemInclude = {
  defaultPackagingUnit: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  defaultSupplier: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
} satisfies Prisma.ItemInclude;

@Injectable()
export class ItemsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateItemDto) {
    await this.validateReferences(dto.defaultPackagingUnitId, dto.defaultSupplierId);

    return this.prisma.item.create({
      data: {
        sku: dto.sku.trim().toUpperCase(),
        name: dto.name.trim(),
        description: dto.description,
        category: dto.category,
        brand: dto.brand,
        estimatedUnitPrice: dto.estimatedUnitPrice ?? 0,
        defaultPackagingUnitId: dto.defaultPackagingUnitId,
        defaultSupplierId: dto.defaultSupplierId,
        isActive: dto.isActive ?? true,
      },
      include: itemInclude,
    });
  }

  async findAll(query: ItemQueryDto) {
    const { page, limit, skip, take } = getPagination(query);
    const where: Prisma.ItemWhereInput = {
      deletedAt: null,
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.category ? { category: { equals: query.category, mode: 'insensitive' } } : {}),
      ...(query.defaultSupplierId ? { defaultSupplierId: query.defaultSupplierId } : {}),
      ...(query.defaultPackagingUnitId ? { defaultPackagingUnitId: query.defaultPackagingUnitId } : {}),
      ...(query.search
        ? {
            OR: [
              { sku: { contains: query.search, mode: 'insensitive' } },
              { name: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
              { category: { contains: query.search, mode: 'insensitive' } },
              { brand: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.item.findMany({
        where,
        include: itemInclude,
        skip,
        take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.item.count({ where }),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: itemInclude,
    });

    if (!item) {
      throw new NotFoundException('Item not found.');
    }

    return item;
  }

  async update(id: string, dto: UpdateItemDto) {
    await this.findOne(id);
    await this.validateReferences(dto.defaultPackagingUnitId, dto.defaultSupplierId);

    return this.prisma.item.update({
      where: { id },
      data: {
        ...(dto.sku ? { sku: dto.sku.trim().toUpperCase() } : {}),
        ...(dto.name ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.brand !== undefined ? { brand: dto.brand } : {}),
        ...(dto.estimatedUnitPrice !== undefined ? { estimatedUnitPrice: dto.estimatedUnitPrice } : {}),
        ...(dto.defaultPackagingUnitId !== undefined ? { defaultPackagingUnitId: dto.defaultPackagingUnitId } : {}),
        ...(dto.defaultSupplierId !== undefined ? { defaultSupplierId: dto.defaultSupplierId } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: itemInclude,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.item.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
      include: itemInclude,
    });
  }

  private async validateReferences(defaultPackagingUnitId?: string, defaultSupplierId?: string) {
    if (defaultPackagingUnitId) {
      const packagingUnit = await this.prisma.packagingUnit.findFirst({
        where: {
          id: defaultPackagingUnitId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!packagingUnit) {
        throw new BadRequestException('Default packaging unit does not exist or is inactive.');
      }
    }

    if (defaultSupplierId) {
      const supplier = await this.prisma.supplier.findFirst({
        where: {
          id: defaultSupplierId,
          deletedAt: null,
          isActive: true,
        },
      });

      if (!supplier) {
        throw new BadRequestException('Default supplier does not exist or is inactive.');
      }
    }
  }
}
