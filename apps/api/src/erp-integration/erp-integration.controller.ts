import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErpSyncLogQueryDto } from './dto/erp-sync-log-query.dto';
import { SyncPurchaseOrderDto } from './dto/sync-purchase-order.dto';
import { ErpIntegrationService } from './erp-integration.service';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('ERP Integration')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Purchasing)
@Controller('erp-integration')
export class ErpIntegrationController {
  constructor(private readonly erpIntegrationService: ErpIntegrationService) {}

  @Post('purchase-orders/:purchaseOrderId/sync')
  @ApiOperation({ summary: 'Sync a purchase order to mock ERP. Admin or Purchasing only.' })
  syncPurchaseOrder(
    @Param('purchaseOrderId') purchaseOrderId: string,
    @Body() dto: SyncPurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.erpIntegrationService.syncPurchaseOrder(purchaseOrderId, dto, user);
  }

  @Post('sync-logs/:id/retry')
  @ApiOperation({ summary: 'Retry a failed ERP sync log. Admin or Purchasing only.' })
  retryFailedSync(@Param('id') id: string, @Body() dto: SyncPurchaseOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.erpIntegrationService.retryFailedSync(id, dto, user);
  }

  @Get('sync-logs')
  @ApiOperation({ summary: 'List ERP sync logs. Admin or Purchasing only.' })
  findLogs(@Query() query: ErpSyncLogQueryDto) {
    return this.erpIntegrationService.findLogs(query);
  }

  @Get('sync-logs/:id')
  @ApiOperation({ summary: 'Get ERP sync log detail. Admin or Purchasing only.' })
  findLog(@Param('id') id: string) {
    return this.erpIntegrationService.findLog(id);
  }
}
