import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password.' })
  login(@Body() dto: LoginDto, @Req() request: Request) {
    const userAgent = request.headers['user-agent'];

    return this.authService.login(dto, {
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent.join(', ') : userAgent,
    });
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated user profile from the JWT.' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
