import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request, Response } from 'express';
import { CryptoService } from '@org/backend-crypto';
import { UserService } from '../../user/user.service';
import { EmailService } from '../../../email/email.service';
import { AuthService } from './auth.service';
import { SessionService } from './session.service';
import { AuthTokenService, OneTimeTokenKind } from './auth-token.service';
import { AuthAuditService, AuthEvent } from './auth-audit.service';

const ACCESS_TTL_MS = 900_000;
const REFRESH_TTL_MS = 86_400_000;

describe('AuthService', () => {
  const request = { headers: {} } as Request;
  let crypto: { encryptData: jest.Mock; decryptData: jest.Mock };
  let userService: {
    getOne: jest.Mock;
    getOneOrFail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let sessionService: {
    createSession: jest.Mock;
    rotateSession: jest.Mock;
    revokeSession: jest.Mock;
    revokeAllSessions: jest.Mock;
    revokeOtherSessions: jest.Mock;
  };
  let authToken: { issue: jest.Mock; consume: jest.Mock };
  let email: {
    sendWelcomeEmail: jest.Mock;
    sendVerificationEmail: jest.Mock;
    sendPasswordResetEmail: jest.Mock;
  };
  let audit: { record: jest.Mock };
  let service: AuthService;

  function mockResponse(): Response {
    return { cookie: jest.fn(), clearCookie: jest.fn() } as unknown as Response;
  }

  beforeEach(() => {
    crypto = { encryptData: jest.fn(() => 'encrypted'), decryptData: jest.fn() };
    userService = {
      getOne: jest.fn(),
      getOneOrFail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    sessionService = {
      createSession: jest.fn().mockResolvedValue({
        jti: 'jti-1',
        accessToken: 'access',
        refreshToken: 'refresh',
        accessTokenTtlMs: ACCESS_TTL_MS,
        refreshTokenTtlMs: REFRESH_TTL_MS,
      }),
      rotateSession: jest.fn().mockResolvedValue({
        accessToken: 'access2',
        refreshToken: 'refresh2',
        accessTokenTtlMs: ACCESS_TTL_MS,
        refreshTokenTtlMs: REFRESH_TTL_MS,
      }),
      revokeSession: jest.fn(),
      revokeAllSessions: jest.fn(),
      revokeOtherSessions: jest.fn(),
    };
    authToken = { issue: jest.fn().mockResolvedValue('one-time-token'), consume: jest.fn() };
    email = {
      sendWelcomeEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendPasswordResetEmail: jest.fn(),
    };
    audit = { record: jest.fn() };

    service = new AuthService(
      crypto as unknown as CryptoService,
      userService as unknown as UserService,
      sessionService as unknown as SessionService,
      authToken as unknown as AuthTokenService,
      email as unknown as EmailService,
      audit as unknown as AuthAuditService,
    );
  });

  describe('register', () => {
    const dto = { email: 'a@b.c', password: 'passw0rd', confirmPassword: 'passw0rd' };

    it('rejects a duplicate email', async () => {
      userService.getOne.mockResolvedValue({ id: 'user-1' });
      await expect(service.register(dto, request)).rejects.toBeInstanceOf(ConflictException);
    });

    it('creates the user and sends a verification email instead of the welcome email', async () => {
      userService.getOne.mockResolvedValue(null);
      userService.create.mockResolvedValue({ id: 'user-1', email: 'a@b.c' });

      const result = await service.register(dto, request);

      expect(userService.create).toHaveBeenCalledWith({ email: 'a@b.c', password: 'passw0rd' });
      expect(authToken.issue).toHaveBeenCalledWith(
        OneTimeTokenKind.EMAIL_VERIFY,
        'user-1',
        expect.any(Number),
      );
      expect(email.sendVerificationEmail).toHaveBeenCalledWith('a@b.c', 'one-time-token');
      expect(email.sendWelcomeEmail).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        AuthEvent.REGISTERED,
        expect.objectContaining({ userId: 'user-1' }),
      );
      expect(result.email).toBe('a@b.c');
    });
  });

  describe('verifyEmail', () => {
    it('rejects an invalid or expired token', async () => {
      authToken.consume.mockResolvedValue(null);
      await expect(service.verifyEmail('bad', request)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the user verified and sends the welcome email', async () => {
      authToken.consume.mockResolvedValue('user-1');
      userService.getOneOrFail.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.c',
        isEmailVerified: false,
      });

      await service.verifyEmail('tok', request);

      expect(userService.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), {
        isEmailVerified: true,
      });
      expect(email.sendWelcomeEmail).toHaveBeenCalledWith('a@b.c');
      expect(audit.record).toHaveBeenCalledWith(AuthEvent.EMAIL_VERIFIED, expect.any(Object));
    });
  });

  describe('forgotPassword', () => {
    it('returns a uniform response and issues nothing for an unknown email', async () => {
      userService.getOne.mockResolvedValue(null);

      await service.forgotPassword('nobody@b.c', request);

      expect(authToken.issue).not.toHaveBeenCalled();
      expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('issues a reset token and emails it when the user exists', async () => {
      userService.getOne.mockResolvedValue({ id: 'user-1' });

      await service.forgotPassword('a@b.c', request);

      expect(authToken.issue).toHaveBeenCalledWith(
        OneTimeTokenKind.PASSWORD_RESET,
        'user-1',
        expect.any(Number),
      );
      expect(email.sendPasswordResetEmail).toHaveBeenCalledWith('a@b.c', 'one-time-token');
    });
  });

  describe('resetPassword', () => {
    const dto = { token: 'tok', password: 'newpass1', confirmPassword: 'newpass1' };

    it('rejects an invalid or expired token', async () => {
      authToken.consume.mockResolvedValue(null);
      await expect(service.resetPassword(dto, request)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('updates the password and revokes every session', async () => {
      authToken.consume.mockResolvedValue('user-1');
      userService.getOneOrFail.mockResolvedValue({ id: 'user-1', email: 'a@b.c' });

      await service.resetPassword(dto, request);

      expect(userService.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), {
        password: 'newpass1',
      });
      expect(sessionService.revokeAllSessions).toHaveBeenCalledWith('user-1');
    });
  });

  describe('changePassword', () => {
    let user: { id: string; email: string; password: string };

    beforeEach(async () => {
      user = { id: 'user-1', email: 'a@b.c', password: await argon2.hash('current-pass') };
    });

    it('rejects a wrong current password', async () => {
      await expect(
        service.changePassword(
          user as never,
          'jti-1',
          { currentPassword: 'wrong', newPassword: 'newpass1', confirmPassword: 'newpass1' },
          request,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('updates the password and revokes the other sessions, keeping the current one', async () => {
      await service.changePassword(
        user as never,
        'jti-1',
        { currentPassword: 'current-pass', newPassword: 'newpass1', confirmPassword: 'newpass1' },
        request,
      );

      expect(userService.update).toHaveBeenCalledWith(user, { password: 'newpass1' });
      expect(sessionService.revokeOtherSessions).toHaveBeenCalledWith('user-1', 'jti-1');
    });
  });

  describe('login', () => {
    it('creates a session, sets two cookies and returns the user', async () => {
      const response = mockResponse();

      const result = await service.login(
        { id: 'user-1', email: 'a@b.c', avatar: null, balance: 0 } as never,
        response,
        request,
        true,
      );

      expect(sessionService.createSession).toHaveBeenCalledWith('user-1', true);
      expect(response.cookie).toHaveBeenCalledTimes(2);
      expect(audit.record).toHaveBeenCalledWith(
        AuthEvent.LOGIN_SUCCEEDED,
        expect.objectContaining({ jti: 'jti-1' }),
      );
      expect(result.user.email).toBe('a@b.c');
    });
  });

  describe('logout', () => {
    it('rejects when there is no authenticated session jti', async () => {
      await expect(
        service.logout({ id: 'user-1' } as never, { headers: {} } as Request, mockResponse()),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('revokes the session and clears both cookies', async () => {
      const response = mockResponse();

      await service.logout(
        { id: 'user-1' } as never,
        { sessionJti: 'jti-1' } as unknown as Request,
        response,
      );

      expect(sessionService.revokeSession).toHaveBeenCalledWith('user-1', 'jti-1');
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshToken', () => {
    it('clears the cookies and rethrows when the session cookie is missing', async () => {
      const response = mockResponse();

      await expect(
        service.refreshToken({ cookies: {} } as Request, response, 'user'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(response.clearCookie).toHaveBeenCalledTimes(2);
    });

    it('rotates the session preserving the remember flag and sets fresh cookies', async () => {
      const response = mockResponse();
      crypto.decryptData.mockReturnValue(
        JSON.stringify({ id: 'user-1', jti: 'jti-1', remember: true }),
      );
      userService.getOneOrFail.mockResolvedValue({
        id: 'user-1',
        email: 'a@b.c',
        avatar: null,
        balance: 0,
      });

      await service.refreshToken(
        { cookies: { sub: 'enc' } } as unknown as Request,
        response,
        'user',
      );

      expect(sessionService.rotateSession).toHaveBeenCalledWith('user-1', 'jti-1', true);
      expect(response.cookie).toHaveBeenCalledTimes(2);
      expect(audit.record).toHaveBeenCalledWith(AuthEvent.TOKEN_REFRESHED, expect.any(Object));
    });
  });
});
