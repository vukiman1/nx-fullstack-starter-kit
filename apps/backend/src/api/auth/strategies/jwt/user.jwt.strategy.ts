import { StrategyKey } from '@org/backend-constants';
import { JwtPayload } from '@org/backend-jwt';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UserService } from '../../../user/user.service';
import { SessionService } from '../../services/session.service';

function getJwtSecret(configService: ConfigService): string {
  const secret = configService.get<string>('jwt.secret');
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

@Injectable()
export class JwtUserStrategy extends PassportStrategy(Strategy, StrategyKey.JWT.USER) {
  constructor(
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      ignoreExpiration: false,
      secretOrKey: getJwtSecret(configService),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const { id, jti } = payload;
    const accessToken = req?.cookies?.access_token ?? '';
    const isActive = await this.sessionService.isAccessTokenActive(id, jti, accessToken);
    if (!isActive) {
      throw new UnauthorizedException();
    }
    req.sessionJti = jti;
    return this.userService.getOneOrFail({ id });
  }
}
