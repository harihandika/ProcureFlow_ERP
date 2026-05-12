import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateReceivingDto } from './dto/create-receiving.dto';
import { ReceivingService } from './receiving.service';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Receiving')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Warehouse)
@Controller('receivings')
export class ReceivingController {
  constructor(private readonly receivingService: ReceivingService) {}

  @Post()
  @ApiOperation({ summary: 'Receive purchase order items partially or fully. Admin or Warehouse only.' })
  receive(@Body() dto: CreateReceivingDto, @CurrentUser() user: AuthenticatedUser) {
    return this.receivingService.receive(dto, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get receiving detail. Admin or Warehouse only.' })
  findOne(@Param('id') id: string) {
    return this.receivingService.findOne(id);
  }

  @Get('purchase-orders/:purchaseOrderId')
  @ApiOperation({ summary: 'List receiving records for a purchase order. Admin or Warehouse only.' })
  findByPurchaseOrder(@Param('purchaseOrderId') purchaseOrderId: string) {
    return this.receivingService.findByPurchaseOrder(purchaseOrderId);
  }
}
