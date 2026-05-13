import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService, type JwtSignOptions } from '@nestjs/jwt';
import { JwtPayload } from './jwt.payload';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async signJwt(payload: JwtPayload, isRefreshToken = false): Promise<string> {
    const refreshTokenExpiresIn = this.configService.get<string>(
      'jwt.refreshTokenExpiresIn',
    );
    const accessTokenExpiresIn = this.configService.get<string>(
      'jwt.accessTokenExpiresIn',
    );
    const expiresIn = isRefreshToken
      ? refreshTokenExpiresIn
      : accessTokenExpiresIn;
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
}
