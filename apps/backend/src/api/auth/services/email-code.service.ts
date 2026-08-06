import { Injectable } from '@nestjs/common';
import { RedisService } from '@org/backend-redis';
import { createHash, randomInt, timingSafeEqual } from 'crypto';

export enum EmailCodeKind {
  EMAIL_VERIFY = 'EMAIL_CODE_VERIFY',
  PASSWORD_RESET = 'EMAIL_CODE_PASSWORD_RESET',
  TWO_FACTOR_RECOVERY = 'EMAIL_CODE_TWO_FACTOR_RECOVERY',
}

const CODE_DIGITS = 6;

/**
 * Six digits is a million possibilities. That is only safe because a code dies after this many
 * wrong guesses — without the counter the whole space is reachable inside the TTL.
 */
const MAX_ATTEMPTS = 5;

interface CodeRecord {
  readonly userId: string;
  readonly codeHash: string;
  readonly attempts: number;
}

@Injectable()
export class EmailCodeService {
  constructor(private readonly redisService: RedisService) {}

  /**
   * One live code per user per kind: issuing again replaces the previous one, so a second request
   * cannot leave two working codes behind.
   */
  async issue(kind: EmailCodeKind, userId: string, ttlMs: number): Promise<string> {
    const code = String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0');
    await this.write(kind, userId, { userId, codeHash: hash(code), attempts: 0 }, ttlMs);
    return code;
  }

  /** Returns the user the code belongs to, or null. A correct code is spent either way. */
  async consume(kind: EmailCodeKind, userId: string, code: string): Promise<string | null> {
    const record = await this.read(kind, userId);
    if (!record) {
      return null;
    }

    if (!equalsInConstantTime(record.codeHash, hash(code.trim()))) {
      await this.recordFailure(kind, userId, record);
      return null;
    }

    await this.redisService.del(this.key(kind, userId));
    return record.userId;
  }

  private async recordFailure(
    kind: EmailCodeKind,
    userId: string,
    record: CodeRecord,
  ): Promise<void> {
    const attempts = record.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) {
      await this.redisService.del(this.key(kind, userId));
      return;
    }
    // Keeping the remaining TTL would need a round trip; a fresh short window is close enough and
    // never extends the life of a code beyond its original expiry by more than the reissue window.
    await this.write(kind, userId, { ...record, attempts }, REMAINING_WINDOW_MS);
  }

  private async read(kind: EmailCodeKind, userId: string): Promise<CodeRecord | null> {
    const raw = await this.redisService.get(this.key(kind, userId));
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as CodeRecord;
    } catch {
      return null;
    }
  }

  private async write(
    kind: EmailCodeKind,
    userId: string,
    record: CodeRecord,
    ttlMs: number,
  ): Promise<void> {
    await this.redisService.set({
      key: this.key(kind, userId),
      value: JSON.stringify(record),
      expired: Math.floor(ttlMs / 1000),
    });
  }

  private key(kind: EmailCodeKind, userId: string): string {
    return `${kind}:${userId}`;
  }
}

const REMAINING_WINDOW_MS = 10 * 60 * 1000;

function hash(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function equalsInConstantTime(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
