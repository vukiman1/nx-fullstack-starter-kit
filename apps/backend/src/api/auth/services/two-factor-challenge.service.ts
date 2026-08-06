import { Injectable } from '@nestjs/common';
import { RedisService } from '@org/backend-redis';
import { randomBytes } from 'crypto';

const CHALLENGE_KEY_PREFIX = '2FA_CHALLENGE';
const TOKEN_BYTES = 32;
const TTL_SECONDS = 300;

// Six digits is a million guesses — brute-forceable inside the five minute window if unbounded.
const MAX_ATTEMPTS = 5;

interface ChallengePayload {
  readonly userId: string;
  readonly rememberMe: boolean;
  readonly attempts: number;
}

export interface ChallengeClaim {
  readonly userId: string;
  readonly rememberMe: boolean;
}

@Injectable()
export class TwoFactorChallengeService {
  constructor(private readonly redisService: RedisService) {}

  /** Grants exactly one right: to try a second-factor code. It is not a session. */
  async issue(userId: string, rememberMe: boolean): Promise<string> {
    const token = randomBytes(TOKEN_BYTES).toString('hex');
    await this.write(token, { userId, rememberMe, attempts: 0 });
    return token;
  }

  async peek(token: string): Promise<ChallengeClaim | null> {
    const payload = await this.read(token);
    return payload ? { userId: payload.userId, rememberMe: payload.rememberMe } : null;
  }

  /** Returns false once the challenge has been spent and destroyed. */
  async recordFailure(token: string): Promise<boolean> {
    const payload = await this.read(token);
    if (!payload) {
      return false;
    }

    const attempts = payload.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await this.consume(token);
      return false;
    }

    await this.write(token, { ...payload, attempts });
    return true;
  }

  async consume(token: string): Promise<void> {
    await this.redisService.del(this.key(token));
  }

  private async read(token: string): Promise<ChallengePayload | null> {
    const raw = await this.redisService.get(this.key(token));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as ChallengePayload;
    } catch {
      return null;
    }
  }

  private async write(token: string, payload: ChallengePayload): Promise<void> {
    await this.redisService.set({
      key: this.key(token),
      value: JSON.stringify(payload),
      expired: TTL_SECONDS,
    });
  }

  private key(token: string): string {
    return `${CHALLENGE_KEY_PREFIX}:${token}`;
  }
}
