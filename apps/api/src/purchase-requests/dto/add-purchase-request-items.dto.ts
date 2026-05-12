import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { PurchaseRequestItemInputDto } from './purchase-request-item-input.dto';

export class AddPurchaseRequestItemsDto {
  @ApiProperty({ type: [PurchaseRequestItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemInputDto)
  items: PurchaseRequestItemInputDto[];
}
