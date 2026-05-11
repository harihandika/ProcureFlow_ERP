import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../prisma/prisma.service';

interface LoginContext {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto, context?: LoginContext) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: dto.email.toLowerCase(),
        deletedAt: null,
      },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          include: { role: true },
        },
        department: true,
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const roles = user.roleAssignments.map((assignment) => assignment.role.name);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles,
    };

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: this.toAuthenticatedUser(user),
    };
  }

  async me(user: AuthenticatedUser) {
    return user;
  }

  private toAuthenticatedUser(user: {
    id: string;
    email: string;
    fullName: string;
    departmentId: string | null;
    roleAssignments: Array<{ role: { name: string } }>;
  }): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      departmentId: user.departmentId,
      roles: user.roleAssignments.map((assignment) => assignment.role.name),
    };
  }
}
