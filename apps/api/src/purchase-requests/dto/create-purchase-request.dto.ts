import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PurchaseRequestPriority } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PurchaseRequestItemInputDto } from './purchase-request-item-input.dto';

export class CreatePurchaseRequestDto {
  @ApiProperty({ example: 'Laptop refresh for IT onboarding' })
  @IsString()
  @MaxLength(180)
  title: string;

  @ApiPropertyOptional({ example: 'Equipment required for new employees.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({ enum: PurchaseRequestPriority, default: PurchaseRequestPriority.NORMAL })
  @IsOptional()
  @IsEnum(PurchaseRequestPriority)
  priority?: PurchaseRequestPriority;

  @ApiPropertyOptional({ example: '2026-06-30' })
  @IsOptional()
  @IsDateString()
  requiredDate?: string;

  @ApiPropertyOptional({ description: 'Department id. Defaults to requester department.' })
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Budget id. Required before submit.' })
  @IsOptional()
  @IsUUID()
  budgetId?: string;

  @ApiPropertyOptional({ type: [PurchaseRequestItemInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PurchaseRequestItemInputDto)
  items?: PurchaseRequestItemInputDto[];
}
