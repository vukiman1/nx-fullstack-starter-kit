import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@org/backend-enum';
import { OAuth2Client, type TokenPayload } from 'google-auth-library';
import { NormalizedIdentity } from './normalized-identity';

const GOOGLE_CLIENT_ID_CONFIG_KEY = 'google.clientId';

@Injectable()
export class GoogleOneTapVerifier {
  private readonly clientId: string;
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.get<string>(GOOGLE_CLIENT_ID_CONFIG_KEY) ?? '';
    this.client = new OAuth2Client(this.clientId);
  }

  async verify(credential: string): Promise<NormalizedIdentity> {
    const payload = await this.verifyToken(credential);
    if (!payload.email || payload.email_verified !== true) {
      throw new ForbiddenException('Google account email is not verified');
    }
    return {
      provider: AuthProvider.GOOGLE,
      providerAccountId: payload.sub,
      email: payload.email,
      emailVerified: true,
      displayName: payload.name,
      avatar: payload.picture,
    };
  }

  private async verifyToken(credential: string): Promise<TokenPayload> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken: credential,
        audience: this.clientId,
      });
      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Empty Google token payload');
      }
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid Google credential');
    }
  }
}
