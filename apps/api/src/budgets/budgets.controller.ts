import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { BudgetAdjustmentDto } from './dto/budget-adjustment.dto';
import { BudgetQueryDto } from './dto/budget-query.dto';
import { BudgetTransactionQueryDto } from './dto/budget-transaction-query.dto';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { AppRole } from '../common/constants/roles';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Budgets')
@ApiBearerAuth()
@Roles(AppRole.Admin, AppRole.Finance)
@Controller('budgets')
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a budget and initial allocation transaction. Admin or Finance only.' })
  create(@Body() dto: CreateBudgetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.create(dto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List budgets with pagination, search, and filters. Admin or Finance only.' })
  findAll(@Query() query: BudgetQueryDto) {
    return this.budgetsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get budget detail. Admin or Finance only.' })
  findOne(@Param('id') id: string) {
    return this.budgetsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update budget metadata and status. Admin or Finance only.' })
  update(@Param('id') id: string, @Body() dto: UpdateBudgetDto) {
    return this.budgetsService.update(id, dto);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'Get budget transactions. Admin or Finance only.' })
  findTransactions(@Param('id') id: string, @Query() query: BudgetTransactionQueryDto) {
    return this.budgetsService.findTransactions(id, query);
  }

  @Post(':id/adjustments')
  @ApiOperation({ summary: 'Create a budget adjustment transaction. Admin or Finance only.' })
  adjust(@Param('id') id: string, @Body() dto: BudgetAdjustmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.budgetsService.adjust(id, dto, user.id);
  }
}
