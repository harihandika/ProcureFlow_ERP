import { ApiPropertyOptional } from '@nestjs/swagger';
import { ErpSyncOperation, ErpSyncStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class ErpSyncLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ErpSyncOperation })
  @IsOptional()
  @IsEnum(ErpSyncOperation)
  operation?: ErpSyncOperation;

  @ApiPropertyOptional({ enum: ErpSyncStatus })
  @IsOptional()
  @IsEnum(ErpSyncStatus)
  status?: ErpSyncStatus;

  @ApiPropertyOptional({ description: 'Purchase order id.' })
  @IsOptional()
  @IsUUID()
  purchaseOrderId?: string;
}
