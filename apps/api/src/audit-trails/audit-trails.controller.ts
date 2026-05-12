import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuditTrailQueryDto } from './dto/audit-trail-query.dto';
import { AuditTrailsService } from './audit-trails.service';
import { AppRole } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Audit Trails')
@ApiBearerAuth()
@Roles(AppRole.Admin)
@Controller('audit-trails')
export class AuditTrailsController {
  constructor(private readonly auditTrailsService: AuditTrailsService) {}

  @Get()
  @ApiOperation({ summary: 'List audit trail records. Admin only.' })
  findAll(@Query() query: AuditTrailQueryDto) {
    return this.auditTrailsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit trail detail. Admin only.' })
  findOne(@Param('id') id: string) {
    return this.auditTrailsService.findOne(id);
  }
}
