import { JwtService } from '@nestjs/jwt';
import { UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const jwtService = {
    signAsync: jest.fn(),
  };
  const auditTrailsService = {
    record: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an access token for valid credentials', async () => {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-id',
      email: 'admin@procureflow.test',
      passwordHash,
      fullName: 'Alya Admin',
      status: UserStatus.ACTIVE,
      departmentId: null,
      roleAssignments: [{ role: { name: 'ADMIN' } }],
    });
    prisma.user.update.mockResolvedValue({});
    jwtService.signAsync.mockResolvedValue('signed.jwt.token');

    const service = new AuthService(
      prisma as never,
      jwtService as unknown as JwtService,
      auditTrailsService as never,
    );
    const result = await service.login({ email: 'admin@procureflow.test', password: 'Password123!' });

    expect(result.accessToken).toBe('signed.jwt.token');
    expect(result.user.roles).toEqual(['ADMIN']);
    expect(auditTrailsService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN',
        entityType: 'USER',
        entityId: 'user-id',
      }),
    );
  });

  it('rejects invalid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    const service = new AuthService(
      prisma as never,
      jwtService as unknown as JwtService,
      auditTrailsService as never,
    );

    await expect(service.login({ email: 'missing@procureflow.test', password: 'Password123!' })).rejects.toThrow(
      'Invalid email or password.',
    );
  });
});
