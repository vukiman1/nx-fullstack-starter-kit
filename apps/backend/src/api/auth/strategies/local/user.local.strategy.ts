import { StrategyKey } from '@org/backend-constants';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import * as argon2 from 'argon2';
import type { Request } from 'express';
import { UserEntity } from '../../../user/entities/user.entity';
import { UserService } from '../../../user/user.service';
import { AuthAuditService, AuthEvent } from '../../services/auth-audit.service';
import { Strategy } from 'passport-local';

let dummyHashPromise: Promise<string> | null = null;

// Verify against a fixed dummy hash when the email is unknown, so the response time
// matches the real-user path and attackers can't enumerate accounts by timing.
function dummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('account-enumeration-timing-equalizer');
  return dummyHashPromise;
}

@Injectable()
export class UserLocalStrategy extends PassportStrategy(Strategy, StrategyKey.LOCAL.USER) {
  constructor(
    private readonly userService: UserService,
    private readonly auditService: AuthAuditService,
  ) {
    super({
      usernameField: 'email',
      passwordField: 'password',
      passReqToCallback: true,
    });
  }

  async validate(request: Request, email: string, password: string): Promise<UserEntity> {
    const user = await this.userService.getOne({ email });
    const passwordHash = user?.password ?? (await dummyHash());
    const passwordMatches = await argon2.verify(passwordHash, password).catch(() => false);

    if (!user || !passwordMatches) {
      this.auditService.record(AuthEvent.LOGIN_FAILED, { email, request });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException('Email not verified');
    }

    return user;
  }
}
