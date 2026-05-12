import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppRole } from '../common/constants/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { CreatePackagingUnitDto } from './dto/create-packaging-unit.dto';
import { PackagingUnitQueryDto } from './dto/packaging-unit-query.dto';
import { UpdatePackagingUnitDto } from './dto/update-packaging-unit.dto';
import { PackagingUnitsService } from './packaging-units.service';

@ApiTags('Packaging Units')
@ApiBearerAuth()
@Roles(AppRole.Admin)
@Controller('packaging-units')
export class PackagingUnitsController {
  constructor(private readonly packagingUnitsService: PackagingUnitsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a packaging unit. Admin only.' })
  create(@Body() dto: CreatePackagingUnitDto) {
    return this.packagingUnitsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List packaging units with pagination and search. Admin only.' })
  findAll(@Query() query: PackagingUnitQueryDto) {
    return this.packagingUnitsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a packaging unit by id. Admin only.' })
  findOne(@Param('id') id: string) {
    return this.packagingUnitsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a packaging unit. Admin only.' })
  update(@Param('id') id: string, @Body() dto: UpdatePackagingUnitDto) {
    return this.packagingUnitsService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a packaging unit. Admin only.' })
  remove(@Param('id') id: string) {
    return this.packagingUnitsService.remove(id);
  }
}
