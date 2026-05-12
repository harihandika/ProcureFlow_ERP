import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class PurchaseRequestItemInputDto {
  @ApiProperty({ description: 'Item id.' })
  @IsUUID()
  itemId: string;

  @ApiProperty({ description: 'Packaging unit id.' })
  @IsUUID()
  packagingUnitId: string;

  @ApiProperty({ example: 2 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  @ApiProperty({ example: 12500000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedUnitPrice: number;

  @ApiPropertyOptional({ example: 'Laptop for new employee onboarding.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'Required before onboarding date.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
