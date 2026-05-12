import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'LAPTOP-STD-001' })
  @IsString()
  @MaxLength(80)
  sku: string;

  @ApiProperty({ example: 'Standard Business Laptop' })
  @IsString()
  @MaxLength(180)
  name: string;

  @ApiPropertyOptional({ example: '14-inch laptop for office productivity.' })
  @IsOptional()
  @IsString()
  @MaxLength(800)
  description?: string;

  @ApiPropertyOptional({ example: 'IT Equipment' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  category?: string;

  @ApiPropertyOptional({ example: 'Lenovo' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ example: 12500000 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedUnitPrice?: number;

  @ApiPropertyOptional({ description: 'Default packaging unit id.' })
  @IsOptional()
  @IsUUID()
  defaultPackagingUnitId?: string;

  @ApiPropertyOptional({ description: 'Default supplier id.' })
  @IsOptional()
  @IsUUID()
  defaultSupplierId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
