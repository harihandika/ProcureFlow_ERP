import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MaxLength, ValidateNested } from 'class-validator';
import { ReceivePoItemDto } from './receive-po-item.dto';

export class CreateReceivingDto {
  @ApiProperty({ description: 'Purchase order id.' })
  @IsUUID()
  purchaseOrderId: string;

  @ApiPropertyOptional({ description: 'Warehouse id. Defaults to the purchase order warehouse.' })
  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @ApiPropertyOptional({ example: 'DN-2026-0001' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  deliveryNoteNo?: string;

  @ApiPropertyOptional({ example: 'Partial delivery from supplier.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  remarks?: string;

  @ApiProperty({ type: [ReceivePoItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceivePoItemDto)
  items: ReceivePoItemDto[];
}
