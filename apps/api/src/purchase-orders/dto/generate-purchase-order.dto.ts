import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class GeneratePurchaseOrderDto {
  @ApiProperty({ example: '9b994a20-62f3-4f9b-b47e-6c1cb6cf0311' })
  @IsUUID()
  supplierId!: string;
}
