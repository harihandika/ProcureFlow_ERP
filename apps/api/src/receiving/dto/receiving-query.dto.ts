import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ReceivingStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ReceivingQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ReceivingStatus })
  @IsOptional()
  @IsEnum(ReceivingStatus)
  status?: ReceivingStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}
