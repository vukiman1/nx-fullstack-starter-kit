import {
  BadRequestException,
  GoneException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { EmailService } from '../../../email/email.service';
import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import { AuthAuditService, AuthEvent } from './auth-audit.service';
import { EmailCodeKind, EmailCodeService } from './email-code.service';
import { SessionRevocationService } from './session-revocation.service';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { TwoFactorChallengeService } from './two-factor-challenge.service';
import { TwoFactorService } from './two-factor.service';

const RECOVERY_TTL_MS = 15 * 60 * 1000;

/**
 * Everything a signed-in user does to their own second factor, plus the email escape hatch.
 * Verifying a code at sign-in lives in AuthService, because that path issues the session.
 */
@Injectable()
export class TwoFactorAccountService {
  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly twoFactorChallengeService: TwoFactorChallengeService,
    private readonly emailCodeService: EmailCodeService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly sessionRevocationService: SessionRevocationService,
    private readonly auditService: AuthAuditService,
  ) {}

  async getStatus(user: UserEntity) {
    const enabled = await this.twoFactorService.isEnabled(user.id);
    return {
      enabled,
      unusedRecoveryCodes: enabled
        ? await this.twoFactorService.countUnusedRecoveryCodes(user.id)
        : 0,
    };
  }

  async startSetup(user: UserEntity) {
    // Switching it off requires the password, so an account without one could never undo this.
    // Such an account also signs in through Google, which skips the second factor entirely.
    if (!user.password) {
      throw new BadRequestException('Set a password before turning on two-factor authentication');
    }
    return this.twoFactorService.startEnrolment(user.id, user.email);
  }

  async confirmSetup(user: UserEntity, code: string, request: Request) {
    const result = await this.twoFactorService.confirmEnrolment(user.id, code);
    this.auditService.record(AuthEvent.TWO_FACTOR_ENABLED, { userId: user.id, request });
    return result;
  }

  async disable(user: UserEntity, password: string, request: Request) {
    const matches = user.password ? await argon2.verify(user.password, password) : false;
    if (!matches) {
      throw new UnauthorizedException('Password is incorrect');
    }

    await this.twoFactorService.disable(user.id);
    this.auditService.record(AuthEvent.TWO_FACTOR_DISABLED, { userId: user.id, request });
    return { message: 'Two-factor authentication disabled' };
  }

  async regenerateRecoveryCodes(user: UserEntity) {
    return this.twoFactorService.regenerateRecoveryCodes(user.id);
  }

  /**
   * Gated on a live challenge, so only someone who has already proved the password can trigger the
   * email. Without that gate, knowing an address would be enough to spam its owner.
   */
  async requestRecovery(challengeToken: string, request: Request) {
    const claim = await this.twoFactorChallengeService.peek(challengeToken);
    if (!claim) {
      throw new GoneException('That sign-in attempt has expired. Please start again.');
    }

    const user = await this.userService.getOneOrFail({ id: claim.userId });
    const code = await this.emailCodeService.issue(
      EmailCodeKind.TWO_FACTOR_RECOVERY,
      user.id,
      RECOVERY_TTL_MS,
    );
    await this.emailService.sendTwoFactorRecoveryCode(
      user.email,
      code,
      Math.round(RECOVERY_TTL_MS / 60_000),
    );
    this.auditService.record(AuthEvent.TWO_FACTOR_RECOVERY_REQUESTED, {
      userId: user.id,
      request,
    });

    return { message: 'Check your inbox for a link to turn off two-factor authentication.' };
  }

  /**
   * Drops every session as well: whoever followed this link proved control of the mailbox, not of
   * the account, so anyone already signed in has to authenticate again.
   */
  async confirmRecovery(challengeToken: string, code: string, request: Request) {
    const claim = await this.twoFactorChallengeService.peek(challengeToken);
    if (!claim) {
      throw new GoneException('That sign-in attempt has expired. Please start again.');
    }

    const userId = await this.emailCodeService.consume(
      EmailCodeKind.TWO_FACTOR_RECOVERY,
      claim.userId,
      code,
    );
    if (!userId) {
      throw new BadRequestException('That code is not valid or has expired');
    }

    await this.twoFactorService.disable(userId);
    await this.sessionRevocationService.revokeAll(userId, SessionRevokeReason.SECURITY);
    this.auditService.record(AuthEvent.TWO_FACTOR_RECOVERED, { userId, request });

    return { message: 'Two-factor authentication is off. Sign in with your password.' };
  }
}
