import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetTransactionStatus, BudgetTransactionType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class BudgetTransactionQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BudgetTransactionType })
  @IsOptional()
  @IsEnum(BudgetTransactionType)
  type?: BudgetTransactionType;

  @ApiPropertyOptional({ enum: BudgetTransactionStatus })
  @IsOptional()
  @IsEnum(BudgetTransactionStatus)
  status?: BudgetTransactionStatus;
}
