import {
  BadRequestException,
  GoneException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as argon2 from 'argon2';
import { RegisterDto } from '../dto/register.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import { EmailService } from '../../../email/email.service';
import { SessionService } from './session.service';
import { AuthAuditService, AuthEvent } from './auth-audit.service';
import { UserSessionService } from './user-session.service';
import { SessionRevocationService } from './session-revocation.service';
import { SessionCookieService } from './session-cookie.service';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { SessionPersistence } from '../enums/session-persistence.enum';
import { AuthProvider } from '@org/backend-enum';
import { GoogleOneTapVerifier } from './social/google-one-tap.verifier';
import { SocialAuthService } from './social/social-auth.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorChallengeService } from './two-factor-challenge.service';
import { EmailCodeKind, EmailCodeService } from './email-code.service';
import { requireSessionJti } from '../session-request';

// Short, because a code that a person retypes is far easier to guess than a link token.
const EMAIL_VERIFY_TTL_MS = 15 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

interface IssueSessionOptions {
  persistence: SessionPersistence;
  rememberMe: boolean;
  authProvider: AuthProvider;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly emailService: EmailService,
    private readonly auditService: AuthAuditService,
    private readonly userSessionService: UserSessionService,
    private readonly sessionRevocationService: SessionRevocationService,
    private readonly sessionCookieService: SessionCookieService,
    private readonly googleOneTapVerifier: GoogleOneTapVerifier,
    private readonly socialAuthService: SocialAuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly twoFactorChallengeService: TwoFactorChallengeService,
    private readonly emailCodeService: EmailCodeService,
  ) {}

  me(user: UserEntity) {
    const { email, avatar, balance, isEmailVerified, displayName } = user;
    return {
      user: {
        email,
        displayName,
        avatar,
        balance,
        isEmailVerified,
        hasPassword: Boolean(user.password),
      },
    };
  }

  async login(user: UserEntity, response: Response, request: Request, rememberMe: boolean) {
    // Issuing a session before the code would make the code optional: a caller could skip the
    // prompt and use the cookie straight away.
    if (await this.twoFactorService.isEnabled(user.id)) {
      const challengeToken = await this.twoFactorChallengeService.issue(user.id, rememberMe);
      this.auditService.record(AuthEvent.LOGIN_TWO_FACTOR_REQUIRED, { userId: user.id, request });
      return { twoFactorRequired: true as const, challengeToken };
    }

    const persistence = rememberMe ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD;
    return this.issueSession(user, response, request, {
      persistence,
      rememberMe,
      authProvider: AuthProvider.LOCAL,
    });
  }

  async verifyTwoFactor(
    challengeToken: string,
    code: string,
    response: Response,
    request: Request,
  ) {
    const claim = await this.twoFactorChallengeService.peek(challengeToken);
    if (!claim) {
      // 410 rather than 401: the client has to tell "wrong code, try again" apart from "this
      // challenge is gone, start over", and matching on message text would break on rewording.
      throw new GoneException('That sign-in attempt has expired. Please start again.');
    }

    if (!(await this.twoFactorService.consumeCode(claim.userId, code))) {
      const stillAlive = await this.twoFactorChallengeService.recordFailure(challengeToken);
      this.auditService.record(AuthEvent.LOGIN_TWO_FACTOR_FAILED, {
        userId: claim.userId,
        request,
      });
      if (!stillAlive) {
        throw new GoneException('Too many attempts. Please sign in again.');
      }
      throw new UnauthorizedException('That code is not valid');
    }

    await this.twoFactorChallengeService.consume(challengeToken);
    const user = await this.userService.getOneOrFail({ id: claim.userId });
    return this.issueSession(user, response, request, {
      persistence: claim.rememberMe ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD,
      rememberMe: claim.rememberMe,
      authProvider: AuthProvider.LOCAL,
    });
  }

  async issueSession(
    user: UserEntity,
    response: Response,
    request: Request,
    { persistence, rememberMe, authProvider }: IssueSessionOptions,
  ) {
    const { id, email, avatar, balance } = user;
    const session = await this.sessionService.createSession(id, persistence);
    await this.userSessionService.createSession({
      userId: id,
      jti: session.jti,
      rememberMe,
      authProvider,
      refreshTokenTtlMs: session.refreshTokenTtlMs,
      request,
    });

    this.sessionCookieService.issue(response, { id, jti: session.jti, persistence }, session);
    this.auditService.record(AuthEvent.LOGIN_SUCCEEDED, {
      userId: id,
      email,
      jti: session.jti,
      request,
    });

    return {
      user: { email, avatar, balance },
    };
  }

  async loginWithGoogle(credential: string, response: Response, request: Request) {
    const identity = await this.googleOneTapVerifier.verify(credential);
    const user = await this.socialAuthService.findOrLinkIdentity(identity);
    return this.issueSession(user, response, request, {
      persistence: SessionPersistence.OAUTH,
      rememberMe: false,
      authProvider: AuthProvider.GOOGLE,
    });
  }

  async register({ email, password, displayName }: RegisterDto, request: Request) {
    const existingUser = await this.userService.getOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.userService.create({ email, password, displayName });
    await this.sendVerification(user.id, email);
    this.auditService.record(AuthEvent.REGISTERED, { userId: user.id, email, request });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email,
    };
  }

  async verifyEmail({ email, code }: VerifyEmailDto, request: Request) {
    const user = await this.consumeEmailCode(EmailCodeKind.EMAIL_VERIFY, email, code);
    if (!user.isEmailVerified) {
      await this.userService.update(user, { isEmailVerified: true });
      await this.trySend(() => this.emailService.sendWelcomeEmail(user.email), user.email);
    }
    this.auditService.record(AuthEvent.EMAIL_VERIFIED, {
      userId: user.id,
      email: user.email,
      request,
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.userService.getOne({ email });
    if (user && !user.isEmailVerified) {
      await this.sendVerification(user.id, email);
    }
    return {
      message: 'If the email is registered and unverified, a code has been sent.',
    };
  }

  async forgotPassword(email: string, request: Request) {
    const user = await this.userService.getOne({ email });
    if (user) {
      const code = await this.emailCodeService.issue(
        EmailCodeKind.PASSWORD_RESET,
        user.id,
        PASSWORD_RESET_TTL_MS,
      );
      await this.trySend(
        () =>
          this.emailService.sendPasswordResetCode(email, code, toMinutes(PASSWORD_RESET_TTL_MS)),
        email,
      );
      this.auditService.record(AuthEvent.PASSWORD_RESET_REQUESTED, {
        userId: user.id,
        email,
        request,
      });
    }
    return { message: 'If the email is registered, a code has been sent.' };
  }

  async resetPassword({ email, code, password }: ResetPasswordDto, request: Request) {
    const user = await this.consumeEmailCode(EmailCodeKind.PASSWORD_RESET, email, code);
    await this.userService.update(user, { password });
    await this.sessionRevocationService.revokeAll(user.id, SessionRevokeReason.PASSWORD_RESET);
    this.auditService.record(AuthEvent.PASSWORD_RESET, {
      userId: user.id,
      email: user.email,
      request,
    });

    return { message: 'Password reset successfully' };
  }

  async changePassword(user: UserEntity, jti: string, dto: ChangePasswordDto, request: Request) {
    const matches = user.password ? await argon2.verify(user.password, dto.currentPassword) : false;
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.userService.update(user, { password: dto.newPassword });
    await this.sessionRevocationService.revokeOthers(
      user.id,
      jti,
      SessionRevokeReason.PASSWORD_CHANGED,
    );
    this.auditService.record(AuthEvent.PASSWORD_CHANGED, {
      userId: user.id,
      email: user.email,
      jti,
      request,
    });

    return { message: 'Password changed successfully' };
  }

  async logout(user: UserEntity, request: Request, response: Response) {
    const jti = requireSessionJti(request);
    await this.sessionRevocationService.revokeOne(user.id, jti, SessionRevokeReason.LOGOUT);
    this.sessionCookieService.clear(response);
    this.auditService.record(AuthEvent.LOGOUT, { userId: user.id, jti, request });

    return {
      message: 'Logout successfully',
    };
  }

  async logoutAll(user: UserEntity, response: Response, request: Request) {
    await this.sessionRevocationService.revokeAll(user.id, SessionRevokeReason.LOGOUT_ALL);
    this.sessionCookieService.clear(response);
    this.auditService.record(AuthEvent.LOGOUT_ALL, { userId: user.id, request });

    return {
      message: 'Logged out from all devices',
    };
  }

  async refreshToken(request: Request, response: Response) {
    try {
      const { id, jti, persistence } = this.sessionCookieService.read(request);
      const { email, avatar, balance } = await this.userService.getOneOrFail({ id });
      const tokens = await this.sessionService.rotateSession(id, jti, persistence);
      await this.userSessionService.touchSession(id, jti, request, tokens.refreshTokenTtlMs);

      this.sessionCookieService.issue(response, { id, jti, persistence }, tokens);
      this.auditService.record(AuthEvent.TOKEN_REFRESHED, { userId: id, jti, request });

      return {
        user: { email, avatar, balance },
      };
    } catch (error) {
      // A failed refresh means the session is gone — drop the stale cookies so the
      // browser stops sending them instead of waiting for them to expire.
      this.sessionCookieService.clear(response);
      throw error;
    }
  }

  async listSessions(user: UserEntity, request: Request) {
    const jti = requireSessionJti(request);

    return {
      sessions: await this.userSessionService.listActiveSessions(user.id, jti),
    };
  }

  async revokeDeviceSession(user: UserEntity, sessionId: string, request: Request) {
    const currentJti = requireSessionJti(request);
    const session = await this.userSessionService.getActiveSessionOrFail(user.id, sessionId);
    if (session.jti === currentJti) {
      throw new BadRequestException('Use logout to revoke the current session');
    }

    await this.sessionRevocationService.revokeOne(
      user.id,
      session.jti,
      SessionRevokeReason.REVOKED_BY_USER,
    );

    return { message: 'Session revoked successfully' };
  }

  async revokeOtherDeviceSessions(user: UserEntity, request: Request) {
    const currentJti = requireSessionJti(request);
    await this.sessionRevocationService.revokeOthers(
      user.id,
      currentJti,
      SessionRevokeReason.REVOKED_BY_USER,
    );

    return { message: 'Other sessions revoked' };
  }

  // One message for both failures, so an unknown address is not confirmed as unregistered.
  private async consumeEmailCode(
    kind: EmailCodeKind,
    email: string,
    code: string,
  ): Promise<UserEntity> {
    const pending = await this.userService.getOne({ email });
    const userId = pending ? await this.emailCodeService.consume(kind, pending.id, code) : null;
    if (!userId) {
      throw new BadRequestException('That code is not valid or has expired');
    }
    return this.userService.getOneOrFail({ id: userId });
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const code = await this.emailCodeService.issue(
      EmailCodeKind.EMAIL_VERIFY,
      userId,
      EMAIL_VERIFY_TTL_MS,
    );
    await this.trySend(
      () => this.emailService.sendVerificationCode(email, code, toMinutes(EMAIL_VERIFY_TTL_MS)),
      email,
    );
  }

  private async trySend(send: () => Promise<void>, recipient: string): Promise<void> {
    try {
      await send();
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${recipient}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}

function toMinutes(milliseconds: number): number {
  return Math.round(milliseconds / 60_000);
}
