import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserStatus } from '@prisma/client';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: payload.sub,
        status: UserStatus.ACTIVE,
        deletedAt: null,
      },
      include: {
        roleAssignments: {
          where: { revokedAt: null },
          include: { role: true },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User account is no longer active.');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      departmentId: user.departmentId,
      roles: user.roleAssignments.map((assignment) => assignment.role.name),
    };
  }
}
