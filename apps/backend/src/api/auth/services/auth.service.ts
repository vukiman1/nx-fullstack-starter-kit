import {
  BadRequestException,
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

const EMAIL_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;

interface SessionCookiePayload {
  id: string;
  jti: string;
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
  ) {}

  me(user: UserEntity) {
    const { email, avatar, balance } = user;
    return {
      user: { email, avatar, balance },
    };
  }

  async login(user: UserEntity, response: Response, request: Request) {
    const { id, email, avatar, balance } = user;
    const session = await this.sessionService.createSession(id);

    this.setSessionCookies(response, {
      id,
      jti: session.jti,
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
    this.auditService.record(AuthEvent.PASSWORD_RESET, { userId, email: user.email, request });

    return { message: 'Password reset successfully' };
  }

  async changePassword(user: UserEntity, jti: string, dto: ChangePasswordDto, request: Request) {
    const matches = await argon2.verify(user.password, dto.currentPassword);
    if (!matches) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    await this.userService.update(user, { password: dto.newPassword });
    await this.sessionService.revokeOtherSessions(user.id, jti);
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
    this.clearSessionCookies(response);
    this.auditService.record(AuthEvent.LOGOUT, { userId: user.id, jti, request });

    return {
      message: 'Logout successfully',
    };
  }

  async logoutAll(user: UserEntity, response: Response, request: Request) {
    await this.sessionService.revokeAllSessions(user.id);
    this.clearSessionCookies(response);
    this.auditService.record(AuthEvent.LOGOUT_ALL, { userId: user.id, request });

    return {
      message: 'Logged out from all devices',
    };
  }

  async refreshToken(request: Request, response: Response, userType: UserType) {
    const { id, jti } = this.decodeSessionCookie(request);
    const { email, avatar, balance } = await this.getUserById(id, userType);
    const tokens = await this.sessionService.rotateSession(id, jti);

    this.setSessionCookies(response, {
      id,
      jti,
      accessToken: tokens.accessToken,
      accessTokenTtlMs: tokens.accessTokenTtlMs,
      refreshTokenTtlMs: tokens.refreshTokenTtlMs,
    });
    this.auditService.record(AuthEvent.TOKEN_REFRESHED, { userId: id, jti, request });

    return {
      user: { email, avatar, balance },
    };
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
    const { id, jti, accessToken, accessTokenTtlMs, refreshTokenTtlMs } = params;
    setCookie(response, CookieName.SESSION, this.encodeSessionCookie({ id, jti }), {
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
        return parsed as SessionCookiePayload;
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
