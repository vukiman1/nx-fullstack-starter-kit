import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService, type JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from './jwt.payload';
import { ConfigService } from '@nestjs/config';
import { parseDurationToMs } from './duration';

const ACCESS_TOKEN_EXPIRES_IN = 'jwt.accessTokenExpiresIn';
const REFRESH_TOKEN_EXPIRES_IN = 'jwt.refreshTokenExpiresIn';

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async signJwt(payload: JwtPayload, isRefreshToken = false): Promise<string> {
    const expiresIn = this.getExpiresIn(isRefreshToken);
    const signOptions: JwtSignOptions = {};
    if (expiresIn) {
      signOptions.expiresIn = expiresIn as JwtSignOptions['expiresIn'];
    }
    const token = await this.nestJwtService.signAsync(payload, {
      ...signOptions,
    });

    return token;
  }

  async verifyJwt(token: string): Promise<JwtPayload> {
    try {
      const payload = await this.nestJwtService.verifyAsync<JwtPayload>(token);
      return payload;
    } catch {
      throw new UnauthorizedException();
    }
  }

  getAccessTokenExpiryMs(): number {
    return parseDurationToMs(this.getExpiresIn(false));
  }

  getRefreshTokenExpiryMs(): number {
    return parseDurationToMs(this.getExpiresIn(true));
  }

  private getExpiresIn(isRefreshToken: boolean): string {
    const key = isRefreshToken ? REFRESH_TOKEN_EXPIRES_IN : ACCESS_TOKEN_EXPIRES_IN;
    return this.configService.get<string>(key) ?? '';
  }
}
