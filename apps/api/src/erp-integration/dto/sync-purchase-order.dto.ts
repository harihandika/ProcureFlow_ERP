import { ApiPropertyOptional } from '@nestjs/swagger';
import { ErpSyncStatus } from '@prisma/client';
import { IsIn, IsOptional } from 'class-validator';

export class SyncPurchaseOrderDto {
  @ApiPropertyOptional({
    enum: [ErpSyncStatus.SUCCESS, ErpSyncStatus.FAILED],
    description: 'Optional deterministic mock response for testing/demo.',
  })
  @IsOptional()
  @IsIn([ErpSyncStatus.SUCCESS, ErpSyncStatus.FAILED])
  simulateStatus?: ErpSyncStatus;
}
