import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { UserService } from '../../../user/user.service';
import { AuthAuditService } from '../../services/auth-audit.service';
import { UserLocalStrategy } from './user.local.strategy';

const CORRECT_PASSWORD = 'correct-password';

describe('UserLocalStrategy', () => {
  const request = { headers: {} } as Request;
  let passwordHash: string;
  let userService: jest.Mocked<UserService>;
  let audit: jest.Mocked<AuthAuditService>;
  let strategy: UserLocalStrategy;

  beforeAll(async () => {
    passwordHash = await argon2.hash(CORRECT_PASSWORD);
  });

  beforeEach(() => {
    userService = { getOne: jest.fn() } as unknown as jest.Mocked<UserService>;
    audit = { record: jest.fn() } as unknown as jest.Mocked<AuthAuditService>;
    strategy = new UserLocalStrategy(userService, audit);
  });

  it('returns the same error for an unknown email and a wrong password (no enumeration)', async () => {
    userService.getOne.mockResolvedValueOnce(null);
    const unknownEmail = await strategy
      .validate(request, 'nobody@example.com', 'whatever')
      .catch((error) => error);

    userService.getOne.mockResolvedValueOnce({
      password: passwordHash,
      isEmailVerified: true,
    } as never);
    const wrongPassword = await strategy
      .validate(request, 'user@example.com', 'wrong')
      .catch((error) => error);

    expect(unknownEmail).toBeInstanceOf(UnauthorizedException);
    expect(wrongPassword).toBeInstanceOf(UnauthorizedException);
    expect(unknownEmail.message).toBe(wrongPassword.message);
  });

  it('still runs a hash comparison for unknown emails to equalise timing', async () => {
    const verifySpy = jest.spyOn(argon2, 'verify');
    userService.getOne.mockResolvedValue(null);

    await strategy.validate(request, 'nobody@example.com', 'x').catch(() => undefined);

    expect(verifySpy).toHaveBeenCalled();
  });

  it('blocks login until the email is verified', async () => {
    userService.getOne.mockResolvedValue({
      password: passwordHash,
      isEmailVerified: false,
    } as never);

    await expect(
      strategy.validate(request, 'user@example.com', CORRECT_PASSWORD),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns the user on correct credentials once verified', async () => {
    const user = { id: 'user-1', password: passwordHash, isEmailVerified: true };
    userService.getOne.mockResolvedValue(user as never);

    await expect(strategy.validate(request, 'user@example.com', CORRECT_PASSWORD)).resolves.toBe(
      user,
    );
  });
});
