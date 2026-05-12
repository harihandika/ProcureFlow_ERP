import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class SubmitPurchaseRequestDto {
  @ApiPropertyOptional({ description: 'Budget id. Use this if draft PR was created without a budget.' })
  @IsOptional()
  @IsUUID()
  budgetId?: string;
}
