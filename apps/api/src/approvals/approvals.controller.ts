import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RejectApprovalDto } from './dto/reject-approval.dto';
import { ApprovalsService } from './approvals.service';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Approvals')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Manager, AppRole.Finance)
@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly approvalsService: ApprovalsService) {}

  @Get('my-queue')
  @ApiOperation({ summary: 'List purchase requests available in the current user approval queue.' })
  findMyQueue(@CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.findMyQueue(user);
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve a submitted purchase request.' })
  approve(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.approve(id, user);
  }

  @Post(':id/reject')
  @ApiOperation({ summary: 'Reject a submitted purchase request with a reason.' })
  reject(@Param('id') id: string, @Body() dto: RejectApprovalDto, @CurrentUser() user: AuthenticatedUser) {
    return this.approvalsService.reject(id, dto, user);
  }
}
