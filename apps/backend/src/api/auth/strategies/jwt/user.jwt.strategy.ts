import { StrategyKey } from '@org/backend-constants';
import { JwtPayload } from '@org/backend-jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { UserService } from '../../../user/user.service';

@Injectable()
export class JwtUserStrategy extends PassportStrategy(
  Strategy,
  StrategyKey.JWT.USER,
) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: (req: Request) => req?.cookies?.access_token ?? null,
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    const { id } = payload;
    const where = { id };
    return this.userService.getOneOrFail(where);
  }
}
