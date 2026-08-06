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
import { ChangePasswordDto } from '../dto/change-password.dto';
import { CryptoService } from '@org/backend-crypto';
import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import { clearCookie, CookieName, setCookie } from '@org/backend-helpers';
import { EmailService } from '../../../email/email.service';
import { UserType } from '../interfaces/auth.interface';
import { SessionService } from './session.service';
import { AuthTokenService, OneTimeTokenKind } from './auth-token.service';
import { AuthAuditService, AuthEvent } from './auth-audit.service';
import { UserSessionService } from './user-session.service';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { SessionPersistence } from '../enums/session-persistence.enum';
import { AuthProvider } from '@org/backend-enum';
import { GoogleOneTapVerifier } from './social/google-one-tap.verifier';
import { SocialAuthService } from './social/social-auth.service';
import { TwoFactorService } from './two-factor.service';
import { TwoFactorChallengeService } from './two-factor-challenge.service';

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

interface SessionCookiePayload {
  id: string;
  jti: string;
  persistence: SessionPersistence;
}

interface IssueSessionOptions {
  persistence: SessionPersistence;
  rememberMe: boolean;
  authProvider: AuthProvider;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly cryptoService: CryptoService,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly authTokenService: AuthTokenService,
    private readonly emailService: EmailService,
    private readonly auditService: AuthAuditService,
    private readonly userSessionService: UserSessionService,
    private readonly googleOneTapVerifier: GoogleOneTapVerifier,
    private readonly socialAuthService: SocialAuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly twoFactorChallengeService: TwoFactorChallengeService,
  ) {}

  me(user: UserEntity) {
    const { email, avatar, balance, isEmailVerified } = user;
    return {
      user: { email, avatar, balance, isEmailVerified, hasPassword: Boolean(user.password) },
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

    this.setSessionCookies(response, {
      id,
      jti: session.jti,
      persistence,
      accessToken: session.accessToken,
      accessTokenTtlMs: session.accessTokenTtlMs,
      refreshTokenTtlMs: session.refreshTokenTtlMs,
    });
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

  async register({ email, password }: RegisterDto, request: Request) {
    const existingUser = await this.userService.getOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    const user = await this.userService.create({ email, password });
    await this.sendVerification(user.id, email);
    this.auditService.record(AuthEvent.REGISTERED, { userId: user.id, email, request });

    return {
      message: 'Registration successful. Please check your email to verify your account.',
      email,
    };
  }

  async verifyEmail(token: string, request: Request) {
    const userId = await this.authTokenService.consume(OneTimeTokenKind.EMAIL_VERIFY, token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token');
    }
    const user = await this.userService.getOneOrFail({ id: userId });
    if (!user.isEmailVerified) {
      await this.userService.update(user, { isEmailVerified: true });
      await this.trySend(() => this.emailService.sendWelcomeEmail(user.email), user.email);
    }
    this.auditService.record(AuthEvent.EMAIL_VERIFIED, { userId, email: user.email, request });

    return { message: 'Email verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.userService.getOne({ email });
    if (user && !user.isEmailVerified) {
      await this.sendVerification(user.id, email);
    }
    return {
      message: 'If the email is registered and unverified, a verification link has been sent.',
    };
  }

  async forgotPassword(email: string, request: Request) {
    const user = await this.userService.getOne({ email });
    if (user) {
      const token = await this.authTokenService.issue(
        OneTimeTokenKind.PASSWORD_RESET,
        user.id,
        PASSWORD_RESET_TTL_MS,
      );
      await this.trySend(() => this.emailService.sendPasswordResetEmail(email, token), email);
      this.auditService.record(AuthEvent.PASSWORD_RESET_REQUESTED, {
        userId: user.id,
        email,
        request,
      });
    }
    return { message: 'If the email is registered, a reset link has been sent.' };
  }

  async resetPassword({ token, password }: ResetPasswordDto, request: Request) {
    const userId = await this.authTokenService.consume(OneTimeTokenKind.PASSWORD_RESET, token);
    if (!userId) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const user = await this.userService.getOneOrFail({ id: userId });
    await this.userService.update(user, { password });
    await this.sessionService.revokeAllSessions(userId);
    await this.userSessionService.revokeAllSessions(userId, SessionRevokeReason.PASSWORD_RESET);
    this.auditService.record(AuthEvent.PASSWORD_RESET, { userId, email: user.email, request });

    return { message: 'Password reset successfully' };
  }

  async changePassword(user: UserEntity, jti: string, dto: ChangePasswordDto, request: Request) {
    const matches = user.password ? await argon2.verify(user.password, dto.currentPassword) : false;
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.userService.update(user, { password: dto.newPassword });
    await this.sessionService.revokeOtherSessions(user.id, jti);
    await this.userSessionService.revokeOtherSessions(
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
    const jti = request.sessionJti;
    if (!jti) {
      throw new UnauthorizedException();
    }
    await this.sessionService.revokeSession(user.id, jti);
    await this.userSessionService.revokeSession(user.id, jti);
    this.clearSessionCookies(response);
    this.auditService.record(AuthEvent.LOGOUT, { userId: user.id, jti, request });

    return {
      message: 'Logout successfully',
    };
  }

  async logoutAll(user: UserEntity, response: Response, request: Request) {
    await this.sessionService.revokeAllSessions(user.id);
    await this.userSessionService.revokeAllSessions(user.id);
    this.clearSessionCookies(response);
    this.auditService.record(AuthEvent.LOGOUT_ALL, { userId: user.id, request });

    return {
      message: 'Logged out from all devices',
    };
  }

  async refreshToken(request: Request, response: Response, userType: UserType) {
    try {
      const { id, jti, persistence } = this.decodeSessionCookie(request);
      const { email, avatar, balance } = await this.getUserById(id, userType);
      const tokens = await this.sessionService.rotateSession(id, jti, persistence);
      await this.userSessionService.touchSession(id, jti, request, tokens.refreshTokenTtlMs);

      this.setSessionCookies(response, {
        id,
        jti,
        persistence,
        accessToken: tokens.accessToken,
        accessTokenTtlMs: tokens.accessTokenTtlMs,
        refreshTokenTtlMs: tokens.refreshTokenTtlMs,
      });
      this.auditService.record(AuthEvent.TOKEN_REFRESHED, { userId: id, jti, request });

      return {
        user: { email, avatar, balance },
      };
    } catch (error) {
      // A failed refresh means the session is gone — drop the stale cookies so the
      // browser stops sending them instead of waiting for them to expire.
      this.clearSessionCookies(response);
      throw error;
    }
  }

  async listSessions(user: UserEntity, request: Request) {
    const jti = request.sessionJti;
    if (!jti) {
      throw new UnauthorizedException();
    }

    return {
      sessions: await this.userSessionService.listActiveSessions(user.id, jti),
    };
  }

  async revokeDeviceSession(user: UserEntity, sessionId: string, request: Request) {
    const currentJti = request.sessionJti;
    if (!currentJti) {
      throw new UnauthorizedException();
    }

    const session = await this.userSessionService.getActiveSessionOrFail(user.id, sessionId);
    if (session.jti === currentJti) {
      throw new BadRequestException('Use logout to revoke the current session');
    }

    await this.sessionService.revokeSession(user.id, session.jti);
    await this.userSessionService.revokeSession(
      user.id,
      session.jti,
      SessionRevokeReason.REVOKED_BY_USER,
    );

    return { message: 'Session revoked successfully' };
  }

  async revokeOtherDeviceSessions(user: UserEntity, request: Request) {
    const currentJti = request.sessionJti;
    if (!currentJti) {
      throw new UnauthorizedException();
    }

    await this.sessionService.revokeOtherSessions(user.id, currentJti);
    await this.userSessionService.revokeOtherSessions(
      user.id,
      currentJti,
      SessionRevokeReason.REVOKED_BY_USER,
    );

    return { message: 'Other sessions revoked' };
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const token = await this.authTokenService.issue(
      OneTimeTokenKind.EMAIL_VERIFY,
      userId,
      EMAIL_VERIFY_TTL_MS,
    );
    await this.trySend(() => this.emailService.sendVerificationEmail(email, token), email);
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

  private setSessionCookies(
    response: Response,
    params: SessionCookiePayload & {
      accessToken: string;
      accessTokenTtlMs: number;
      refreshTokenTtlMs: number;
    },
  ) {
    const { id, jti, persistence, accessToken, accessTokenTtlMs, refreshTokenTtlMs } = params;
    setCookie(response, CookieName.SESSION, this.encodeSessionCookie({ id, jti, persistence }), {
      maxAge: refreshTokenTtlMs,
    });
    setCookie(response, CookieName.ACCESS_TOKEN, accessToken, {
      maxAge: accessTokenTtlMs,
    });
  }

  private clearSessionCookies(response: Response) {
    clearCookie(response, CookieName.ACCESS_TOKEN);
    clearCookie(response, CookieName.SESSION);
  }

  private getUserById(id: string, userType: UserType) {
    return this.getService(userType).getOneOrFail({ id });
  }

  private encodeSessionCookie(payload: SessionCookiePayload): string {
    return this.cryptoService.encryptData(JSON.stringify(payload));
  }

  private decodeSessionCookie(request: Request): SessionCookiePayload {
    const raw = request.cookies?.[CookieName.SESSION];
    if (!raw) {
      throw new UnauthorizedException();
    }
    const payload = this.parseSessionCookie(raw);
    if (!payload) {
      throw new UnauthorizedException();
    }
    return payload;
  }

  private parseSessionCookie(raw: string): SessionCookiePayload | null {
    try {
      const parsed: unknown = JSON.parse(this.cryptoService.decryptData(raw));
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof (parsed as Record<string, unknown>).id === 'string' &&
        typeof (parsed as Record<string, unknown>).jti === 'string'
      ) {
        const record = parsed as Record<string, unknown>;
        return {
          id: record.id as string,
          jti: record.jti as string,
          persistence: coercePersistence(record),
        };
      }
      return null;
    } catch {
      return null;
    }
  }

  private getService(type: UserType) {
    switch (type) {
      case 'user':
        return this.userService;
      default:
        return this.userService;
    }
  }
}

function coercePersistence(record: Record<string, unknown>): SessionPersistence {
  const value = record.persistence;
  if (
    value === SessionPersistence.STANDARD ||
    value === SessionPersistence.REMEMBER ||
    value === SessionPersistence.OAUTH
  ) {
    return value;
  }
  // Legacy cookies stored `remember: boolean`; map it onto the persistence policy.
  return record.remember === true ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD;
}
