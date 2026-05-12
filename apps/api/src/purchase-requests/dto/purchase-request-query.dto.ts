import { ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseRequestPriority, PurchaseRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class PurchaseRequestQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: PurchaseRequestStatus })
  @IsOptional()
  @IsEnum(PurchaseRequestStatus)
  status?: PurchaseRequestStatus;

  @ApiPropertyOptional({ enum: PurchaseRequestPriority })
  @IsOptional()
  @IsEnum(PurchaseRequestPriority)
  priority?: PurchaseRequestPriority;

  @ApiPropertyOptional({ description: 'Filter by requester id.' })
  @IsOptional()
  @IsUUID()
  requesterId?: string;

  @ApiPropertyOptional({ description: 'Filter by department id.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Filter by budget id.' })
  @IsOptional()
  @IsUUID()
  budgetId?: string;
}
