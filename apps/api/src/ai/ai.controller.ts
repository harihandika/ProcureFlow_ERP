import { Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiProxyService } from './ai-proxy.service';
import { AuditPrResponseDto } from './dto/audit-pr.dto';
import { AppRole } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('AI')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Manager, AppRole.Finance)
@Controller('ai')
export class AiController {
  constructor(private readonly aiProxyService: AiProxyService) {}

  @Post('audit-pr/:id')
  @ApiOperation({ summary: 'Analisis risiko Purchase Request menggunakan AI.' })
  async auditPurchaseRequest(@Param('id') id: string): Promise<AuditPrResponseDto> {
    return this.aiProxyService.auditPr(id);
  }
}
