import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AddPurchaseRequestItemsDto } from './dto/add-purchase-request-items.dto';
import { CreatePurchaseRequestDto } from './dto/create-purchase-request.dto';
import { PurchaseRequestQueryDto } from './dto/purchase-request-query.dto';
import { SubmitPurchaseRequestDto } from './dto/submit-purchase-request.dto';
import { PurchaseRequestsService } from './purchase-requests.service';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Purchase Requests')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Requester, AppRole.Manager, AppRole.Finance)
@Controller('purchase-requests')
export class PurchaseRequestsController {
  constructor(private readonly purchaseRequestsService: PurchaseRequestsService) {}

  @Post()
  @Roles(AppRole.Admin, AppRole.Requester)
  @ApiOperation({ summary: 'Create a draft purchase request. Requester or Admin only.' })
  createDraft(@Body() dto: CreatePurchaseRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.createDraft(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List purchase requests with pagination, search, and filters.' })
  findAll(@Query() query: PurchaseRequestQueryDto) {
    return this.purchaseRequestsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get purchase request detail.' })
  findOne(@Param('id') id: string) {
    return this.purchaseRequestsService.findOne(id);
  }

  @Post(':id/items')
  @Roles(AppRole.Admin, AppRole.Requester)
  @ApiOperation({ summary: 'Add multiple items to a draft purchase request.' })
  addItems(@Param('id') id: string, @Body() dto: AddPurchaseRequestItemsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.addItems(id, dto, user);
  }

  @Post(':id/submit')
  @Roles(AppRole.Admin, AppRole.Requester)
  @ApiOperation({ summary: 'Submit a draft purchase request after budget validation.' })
  submit(@Param('id') id: string, @Body() dto: SubmitPurchaseRequestDto, @CurrentUser() user: AuthenticatedUser) {
    return this.purchaseRequestsService.submit(id, dto, user);
  }
}
