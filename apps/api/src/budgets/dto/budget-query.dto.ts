import { ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class BudgetQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: BudgetStatus })
  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @ApiPropertyOptional({ description: 'Filter by department id.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ example: 2026 })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  fiscalYear?: number;

  @ApiPropertyOptional({ example: 'FY' })
  @IsOptional()
  @IsString()
  period?: string;
}
