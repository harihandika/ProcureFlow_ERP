import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { AuditPrResponseDto } from './dto/audit-pr.dto';
import { AppRole } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { PurchaseRequestsService } from '../purchase-requests/purchase-requests.service';

@ApiTags('AI')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Manager, AppRole.Finance)
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiProxyService: AiProxyService,
    private readonly purchaseRequestsService: PurchaseRequestsService,
  ) {}

  @Post('audit-pr/:id')
  @ApiOperation({ summary: 'Analisis risiko Purchase Request menggunakan AI.' })
  async auditPurchaseRequest(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser): Promise<AuditPrResponseDto> {
    await this.purchaseRequestsService.findOne(id, user);
    return this.aiProxyService.auditPr(id);
  }
}
