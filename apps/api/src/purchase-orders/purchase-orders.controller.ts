import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GeneratePurchaseOrderDto } from './dto/generate-purchase-order.dto';
import { PurchaseOrderQueryDto } from './dto/purchase-order-query.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Purchase Orders')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Purchasing, AppRole.Finance, AppRole.Warehouse)
@Controller('purchase-orders')
export class PurchaseOrdersController {
  constructor(private readonly purchaseOrdersService: PurchaseOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List purchase orders with pagination, search, and filters.' })
  findAll(@Query() query: PurchaseOrderQueryDto) {
    return this.purchaseOrdersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase order detail.' })
  findOne(@Param('id') id: string) {
    return this.purchaseOrdersService.findOne(id);
  }

  @Post('generate-from-pr/:prId')
  @Roles(AppRole.Admin, AppRole.Purchasing)
  @ApiOperation({ summary: 'Generate a draft purchase order from an approved purchase request.' })
  generateFromPurchaseRequest(
    @Param('prId') prId: string,
    @Body() dto: GeneratePurchaseOrderDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseOrdersService.generateFromPurchaseRequest(prId, dto, user);
  }

  @Patch(':id/status')
  @Roles(AppRole.Admin, AppRole.Purchasing)
  @ApiOperation({ summary: 'Update purchase order status.' })
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderStatusDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseOrdersService.updateStatus(id, dto, user);
  }
}
