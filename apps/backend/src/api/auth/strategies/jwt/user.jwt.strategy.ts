import { StrategyKey } from '@app/constants';
import { JwtPayload } from '@app/jwt';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from 'src/api/user/user.service';

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
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'secret',
    });
  }

  async validate(payload: JwtPayload) {
    const { id } = payload;
    const where = { id };
    // await this.redisService.getAccessToken(id);
    return this.userService.getOneOrFail(where);
  }
}
