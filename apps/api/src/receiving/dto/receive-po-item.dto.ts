import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min, ValidateIf } from 'class-validator';

export class ReceivePoItemDto {
  @ApiPropertyOptional({ description: 'Purchase order item id. Use this for exact line receiving.' })
  @ValidateIf((dto: ReceivePoItemDto) => !dto.itemCode)
  @IsUUID()
  purchaseOrderItemId?: string;

  @ApiPropertyOptional({
    example: 'LAPTOP-STD-001',
    description: 'Barcode/item code simulation. Matches the PO item SKU snapshot or item SKU.',
  })
  @ValidateIf((dto: ReceivePoItemDto) => !dto.purchaseOrderItemId)
  @IsString()
  @MaxLength(120)
  itemCode?: string;

  @ApiProperty({ example: 3 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantityReceived: number;

  @ApiPropertyOptional({ example: 3 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantityAccepted?: number;

  @ApiPropertyOptional({ example: 0 })
  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  quantityRejected?: number;

  @ApiPropertyOptional({ example: 'Carton arrived intact.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  remarks?: string;
}
