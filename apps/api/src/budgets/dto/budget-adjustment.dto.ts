import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class BudgetAdjustmentDto {
  @ApiProperty({
    example: 25000000,
    description: 'Positive amount increases budget. Negative amount decreases budget.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @ApiPropertyOptional({ example: 'Additional allocation for laptop refresh.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
