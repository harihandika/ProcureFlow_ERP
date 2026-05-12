import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BudgetStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateBudgetDto {
  @ApiProperty({ example: 'BGT-IT-2026' })
  @IsString()
  @MaxLength(60)
  code: string;

  @ApiProperty({ example: 'IT Department Budget 2026' })
  @IsString()
  @MaxLength(180)
  name: string;

  @ApiProperty({ example: 2026 })
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  fiscalYear: number;

  @ApiPropertyOptional({ example: 'FY' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  period?: string;

  @ApiPropertyOptional({ example: 'IDR', default: 'IDR' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency?: string;

  @ApiPropertyOptional({ enum: BudgetStatus, default: BudgetStatus.ACTIVE })
  @IsOptional()
  @IsEnum(BudgetStatus)
  status?: BudgetStatus;

  @ApiPropertyOptional({ example: 'Annual operational budget for IT procurement.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: 500000000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  allocatedAmount: number;

  @ApiProperty({ description: 'Department id.' })
  @IsUUID()
  departmentId: string;
}
