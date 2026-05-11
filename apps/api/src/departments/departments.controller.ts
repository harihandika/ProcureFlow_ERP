import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { DepartmentQueryDto } from './dto/department-query.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/constants/roles';

@ApiTags('Departments')
@ApiBearerAuth()
@Roles(AppRole.Admin)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a department. Admin only.' })
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List departments with pagination, search, and filters. Admin only.' })
  findAll(@Query() query: DepartmentQueryDto) {
    return this.departmentsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a department by id. Admin only.' })
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a department. Admin only.' })
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a department. Admin only.' })
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
