import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RegisterDto } from '../dto/register.dto';
import { CryptoService } from '@org/backend-crypto';
import { UserEntity } from '../../user/entities/user.entity';
import { UserService } from '../../user/user.service';
import { clearCookie, CookieName, setCookie } from '@org/backend-helpers';
import { EmailService } from '../../../email/email.service';
import { UserType } from '../interfaces/auth.interface';
import { SessionService } from './session.service';

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
    private readonly emailService: EmailService,
  ) {}

  me(user: UserEntity) {
    const { email, avatar, balance } = user;
    return {
      user: { email, avatar, balance },
    };
  }

  async login(user: UserEntity, response: Response) {
    const { id, email, avatar, balance } = user;
    const session = await this.sessionService.createSession(id);

    this.setSessionCookies(response, {
      id,
      jti: session.jti,
      accessToken: session.accessToken,
      accessTokenTtlMs: session.accessTokenTtlMs,
      refreshTokenTtlMs: session.refreshTokenTtlMs,
    });

    return {
      user: { email, avatar, balance },
    };
  }

  async register({ email, password, confirmPassword }: RegisterDto) {
    if (password !== confirmPassword) {
      throw new BadRequestException('Password and confirm password do not match');
    }
    const existingUser = await this.userService.getOne({ email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }
    await this.userService.create({
      email,
      password,
    });

    try {
      await this.emailService.sendWelcomeEmail(email);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${email}`,
        error instanceof Error ? error.stack : undefined,
      );
    }

    return {
      message: 'User registered successfully',
      email,
    };
  }

  async logout(user: UserEntity, request: Request, response: Response) {
    const jti = request.sessionJti;
    if (!jti) {
      throw new UnauthorizedException();
    }
    await this.sessionService.revokeSession(user.id, jti);
    this.clearSessionCookies(response);
    return {
      message: 'Logout successfully',
    };
  }

  async logoutAll(user: UserEntity, response: Response) {
    await this.sessionService.revokeAllSessions(user.id);
    this.clearSessionCookies(response);
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

    return {
      user: { email, avatar, balance },
    };
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
