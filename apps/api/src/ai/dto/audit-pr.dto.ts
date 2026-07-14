import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FindingDto {
  @ApiProperty({ enum: ['PRICE_ANOMALY', 'BUDGET_WARNING', 'SUPPLIER_RISK', 'GENERAL'] })
  category: 'PRICE_ANOMALY' | 'BUDGET_WARNING' | 'SUPPLIER_RISK' | 'GENERAL';

  @ApiProperty({ enum: ['INFO', 'WARNING', 'CRITICAL'] })
  severity: 'INFO' | 'WARNING' | 'CRITICAL';

  @ApiProperty()
  message: string;

  @ApiPropertyOptional()
  affectedItemSku?: string;
}

export class BudgetImpactDto {
  @ApiProperty()
  remainingBefore: number;

  @ApiProperty()
  remainingAfter: number;

  @ApiProperty()
  usagePercentage: number;
}

export class RecommendationDto {
  @ApiProperty({ enum: ['APPROVE', 'REJECT', 'INVESTIGATE'] })
  action: 'APPROVE' | 'REJECT' | 'INVESTIGATE';

  @ApiProperty()
  justification: string;
}

export class AuditPrResponseDto {
  @ApiProperty()
  riskScore: number;

  @ApiProperty({ enum: ['LOW', 'MEDIUM', 'HIGH'] })
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiProperty()
  budgetImpact: BudgetImpactDto;

  @ApiProperty({ type: [FindingDto] })
  findings: FindingDto[];

  @ApiProperty()
  recommendation: RecommendationDto;
}
