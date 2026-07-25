import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @Roles(AppRole.Admin, AppRole.Finance)
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(':id')
  @Roles(AppRole.Admin, AppRole.Finance)
  findOne(@Param('id') id: string) {
    return this.invoicesService.findOne(id);
  }

  @Post('generate-from-po/:poId')
  @Roles(AppRole.Admin, AppRole.Finance, AppRole.Purchasing)
  generateFromPo(@Param('poId') poId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.generateFromPo(poId, user);
  }

  @Post(':id/pay')
  @Roles(AppRole.Admin, AppRole.Finance)
  payInvoice(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.invoicesService.payInvoice(id, user);
  }
}
