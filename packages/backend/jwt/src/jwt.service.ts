import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService, type JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from './jwt.payload';
import { ConfigService } from '@nestjs/config';
import { parseDurationToMs } from './duration';

const ACCESS_TOKEN_EXPIRES_IN = 'jwt.accessTokenExpiresIn';
const MS_PER_SECOND = 1000;

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async signJwt(payload: JwtPayload, expiresInMs?: number): Promise<string> {
    const expiresIn: string | number =
      expiresInMs != null
        ? Math.floor(expiresInMs / MS_PER_SECOND)
        : this.getAccessTokenExpiresIn();
    const signOptions: JwtSignOptions = {};
    if (expiresIn) {
      signOptions.expiresIn = expiresIn as JwtSignOptions['expiresIn'];
    }
    return this.nestJwtService.signAsync(payload, { ...signOptions });
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
    return parseDurationToMs(this.getAccessTokenExpiresIn());
  }

  private getAccessTokenExpiresIn(): string {
    return this.configService.get<string>(ACCESS_TOKEN_EXPIRES_IN) ?? '';
  }
}
