import { Injectable } from '@nestjs/common';
import { RedisService } from '@org/backend-redis';
import { randomBytes } from 'crypto';

export enum OneTimeTokenKind {
  EMAIL_VERIFY = 'EMAIL_VERIFY',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR_RECOVERY = 'TWO_FACTOR_RECOVERY',
}

const TOKEN_BYTES = 32;
const MS_PER_SECOND = 1000;

@Injectable()
export class AuthTokenService {
  constructor(private readonly redisService: RedisService) {}

  async issue(kind: OneTimeTokenKind, userId: string, ttlMs: number): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await this.redisService.set({
      key: this.key(kind, token),
      value: userId,
      expired: Math.floor(ttlMs / MS_PER_SECOND),
    });
    return token;
  }

  async consume(kind: OneTimeTokenKind, token: string): Promise<string | null> {
    const key = this.key(kind, token);
    const userId = await this.redisService.get(key);
    if (userId) {
      await this.redisService.del(key);
    }
    return userId;
  }

  private key(kind: OneTimeTokenKind, token: string): string {
    return `${kind}:${token}`;
  }
}
