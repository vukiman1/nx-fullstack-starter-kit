import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { UserService } from '../../../user/user.service';
import { SessionService } from '../../services/session.service';
import { JwtUserStrategy } from './user.jwt.strategy';

describe('JwtUserStrategy', () => {
  let userService: jest.Mocked<UserService>;
  let sessionService: jest.Mocked<SessionService>;
  let strategy: JwtUserStrategy;

  beforeEach(() => {
    userService = {
      getOneOrFail: jest.fn().mockResolvedValue({ id: 'user-1' }),
    } as unknown as jest.Mocked<UserService>;
    sessionService = {
      isAccessTokenActive: jest.fn(),
    } as unknown as jest.Mocked<SessionService>;
    const config = { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService;
    strategy = new JwtUserStrategy(userService, sessionService, config);
  });

  function requestWithToken(token: string): Request & { sessionJti?: string } {
    return { cookies: { access_token: token } } as unknown as Request & { sessionJti?: string };
  }

  it('returns the user and tags the request jti when the token is in the allowlist', async () => {
    sessionService.isAccessTokenActive.mockResolvedValue(true);
    const request = requestWithToken('the-access-token');

    const user = await strategy.validate(request, { id: 'user-1', jti: 'jti-1' });

    expect(sessionService.isAccessTokenActive).toHaveBeenCalledWith(
      'user-1',
      'jti-1',
      'the-access-token',
    );
    expect(request.sessionJti).toBe('jti-1');
    expect(user).toEqual({ id: 'user-1' });
  });

  it('rejects when the token is no longer active (revoked)', async () => {
    sessionService.isAccessTokenActive.mockResolvedValue(false);

    await expect(
      strategy.validate(requestWithToken('the-access-token'), { id: 'user-1', jti: 'jti-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
