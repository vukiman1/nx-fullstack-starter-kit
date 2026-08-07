import { BadRequestException, GoneException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { TwoFactorAccountService } from './two-factor-account.service';
import { SessionRevocationService } from './session-revocation.service';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { AuthEvent } from './auth-audit.service';

const request = { headers: {} } as Request;

describe('TwoFactorAccountService', () => {
  let twoFactor: Record<string, jest.Mock>;
  let challenge: Record<string, jest.Mock>;
  let emailCode: Record<string, jest.Mock>;
  let userService: Record<string, jest.Mock>;
  let email: Record<string, jest.Mock>;
  let sessions: Record<string, jest.Mock>;
  let userSessions: Record<string, jest.Mock>;
  let audit: Record<string, jest.Mock>;
  let service: TwoFactorAccountService;

  beforeEach(() => {
    twoFactor = {
      isEnabled: jest.fn().mockResolvedValue(false),
      countUnusedRecoveryCodes: jest.fn().mockResolvedValue(0),
      startEnrolment: jest.fn().mockResolvedValue({ otpauthUri: 'otpauth://x' }),
      confirmEnrolment: jest.fn().mockResolvedValue({ recoveryCodes: [] }),
      disable: jest.fn(),
      regenerateRecoveryCodes: jest.fn(),
    };
    challenge = { peek: jest.fn() };
    emailCode = { issue: jest.fn().mockResolvedValue('123456'), consume: jest.fn() };
    userService = { getOneOrFail: jest.fn() };
    email = { sendTwoFactorRecoveryCode: jest.fn() };
    sessions = { revokeAllSessions: jest.fn() };
    userSessions = { revokeAllSessions: jest.fn() };
    audit = { record: jest.fn() };

    service = new TwoFactorAccountService(
      twoFactor as never,
      challenge as never,
      emailCode as never,
      userService as never,
      email as never,
      new SessionRevocationService(sessions as never, userSessions as never),
      audit as never,
    );
  });

  describe('turning it on', () => {
    it('refuses an account with no password, which could never switch it off again', async () => {
      const googleOnly = { id: 'u1', email: 'a@b.c', password: null } as never;

      await expect(service.startSetup(googleOnly)).rejects.toBeInstanceOf(BadRequestException);
      expect(twoFactor.startEnrolment).not.toHaveBeenCalled();
    });

    it('allows an account that has a password', async () => {
      const withPassword = { id: 'u1', email: 'a@b.c', password: 'hashed' } as never;

      await service.startSetup(withPassword);

      expect(twoFactor.startEnrolment).toHaveBeenCalledWith('u1', 'a@b.c');
    });
  });

  describe('turning it off', () => {
    it('will not switch off without the password, even on a signed-in session', async () => {
      const user = { id: 'u1', email: 'a@b.c', password: await argon2.hash('right') } as never;

      await expect(service.disable(user, 'wrong', request)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
      expect(twoFactor.disable).not.toHaveBeenCalled();
    });

    it('switches off when the password is right', async () => {
      const user = { id: 'u1', email: 'a@b.c', password: await argon2.hash('right') } as never;

      await service.disable(user, 'right', request);

      expect(twoFactor.disable).toHaveBeenCalledWith('u1');
      expect(audit.record).toHaveBeenCalledWith(
        AuthEvent.TWO_FACTOR_DISABLED,
        expect.objectContaining({ userId: 'u1' }),
      );
    });
  });

  describe('recovering by email', () => {
    it('will not send anything without a live challenge, so an address alone cannot be spammed', async () => {
      challenge.peek.mockResolvedValue(null);

      await expect(service.requestRecovery('nope', request)).rejects.toBeInstanceOf(GoneException);
      expect(email.sendTwoFactorRecoveryCode).not.toHaveBeenCalled();
    });

    it('sends to the address on the account, never one supplied by the caller', async () => {
      challenge.peek.mockResolvedValue({ userId: 'u1', rememberMe: false });
      userService.getOneOrFail.mockResolvedValue({ id: 'u1', email: 'a@b.c' });

      await service.requestRecovery('challenge-1', request);

      expect(email.sendTwoFactorRecoveryCode).toHaveBeenCalledWith('a@b.c', '123456', 15);
    });

    it('rejects a code that was never issued or has expired', async () => {
      challenge.peek.mockResolvedValue({ userId: 'u1', rememberMe: false });
      emailCode.consume.mockResolvedValue(null);

      await expect(
        service.confirmRecovery('challenge-1', '000000', request),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(twoFactor.disable).not.toHaveBeenCalled();
    });

    it('turns two-factor off and drops every session', async () => {
      challenge.peek.mockResolvedValue({ userId: 'u1', rememberMe: false });
      emailCode.consume.mockResolvedValue('u1');

      await service.confirmRecovery('challenge-1', '123456', request);

      expect(twoFactor.disable).toHaveBeenCalledWith('u1');
      // The link proves control of the mailbox, not of the account: existing sessions must go.
      expect(sessions.revokeAllSessions).toHaveBeenCalledWith('u1');
      expect(userSessions.revokeAllSessions).toHaveBeenCalledWith(
        'u1',
        SessionRevokeReason.SECURITY,
      );
    });

    it('spends the code so it cannot be replayed', async () => {
      challenge.peek.mockResolvedValue({ userId: 'u1', rememberMe: false });
      emailCode.consume.mockResolvedValue('u1');

      await service.confirmRecovery('challenge-1', '123456', request);

      expect(emailCode.consume).toHaveBeenCalledWith(
        expect.stringContaining('TWO_FACTOR_RECOVERY'),
        'u1',
        '123456',
      );
    });
  });

  it('reports how many recovery codes are left only when it is on', async () => {
    twoFactor.isEnabled.mockResolvedValue(false);

    await expect(service.getStatus({ id: 'u1' } as never)).resolves.toEqual({
      enabled: false,
      unusedRecoveryCodes: 0,
    });
    expect(twoFactor.countUnusedRecoveryCodes).not.toHaveBeenCalled();
  });
});
