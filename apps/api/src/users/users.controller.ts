import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRole } from '../common/constants/roles';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Users')
@ApiBearerAuth()
@Roles(AppRole.Admin)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user and assign roles. Admin only.' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor.id);
  }

  @Get()
  @ApiOperation({ summary: 'List users with pagination, search, and filters. Admin only.' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id. Admin only.' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user and optionally replace active roles. Admin only.' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.update(id, dto, actor.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a user. Admin only.' })
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
