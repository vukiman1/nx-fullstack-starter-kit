import { JwtService, parseDurationToMs } from '@org/backend-jwt';
import { RedisService } from '@org/backend-redis';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'crypto';
import { SessionPersistence } from '../enums/session-persistence.enum';

const ACCESS_TOKEN_KEY_PREFIX = 'AC_TOKEN';
const REFRESH_TOKEN_KEY_PREFIX = 'RF_TOKEN';
const SESSION_SET_KEY_PREFIX = 'SESSIONS';
const MAX_SESSIONS_CONFIG_KEY = 'session.maxSessionsPerUser';
const REFRESH_TTL_CONFIG_KEYS: Record<SessionPersistence, string> = {
  [SessionPersistence.STANDARD]: 'session.refreshTtl',
  [SessionPersistence.REMEMBER]: 'session.refreshTtlRemember',
  [SessionPersistence.OAUTH]: 'session.refreshTtlOauth',
};
const MS_PER_SECOND = 1000;

const TRACK_SESSION_SCRIPT = `
redis.call('ZADD', KEYS[1], ARGV[1], ARGV[2])
redis.call('EXPIRE', KEYS[1], ARGV[3])
return 1
`;

const ENFORCE_LIMIT_SCRIPT = `
local excess = redis.call('ZCARD', KEYS[1]) - tonumber(ARGV[1])
if excess <= 0 then return 0 end
local oldest = redis.call('ZRANGE', KEYS[1], 0, excess - 1)
for _, jti in ipairs(oldest) do
  redis.call('DEL', ARGV[2] .. jti)
  redis.call('DEL', ARGV[3] .. jti)
  redis.call('ZREM', KEYS[1], jti)
end
return excess
`;

export interface SessionTokens {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly accessTokenTtlMs: number;
  readonly refreshTokenTtlMs: number;
}

export interface IssuedSession extends SessionTokens {
  readonly jti: string;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(userId: string, persistence: SessionPersistence): Promise<IssuedSession> {
    const jti = randomUUID();
    const tokens = await this.issueTokens(userId, jti, this.resolveRefreshTtlMs(persistence));
    await this.enforceSessionLimit(userId);
    return { jti, ...tokens };
  }

  async rotateSession(
    userId: string,
    jti: string,
    persistence: SessionPersistence,
  ): Promise<SessionTokens> {
    const storedRefreshToken = await this.redisService.get(this.refreshTokenKey(userId, jti));
    if (!storedRefreshToken) {
      throw new UnauthorizedException();
    }
    await this.jwtService.verifyJwt(storedRefreshToken);
    return this.issueTokens(userId, jti, this.resolveRefreshTtlMs(persistence));
  }

  async isAccessTokenActive(userId: string, jti: string, accessToken: string): Promise<boolean> {
    const storedHash = await this.redisService.get(this.accessTokenKey(userId, jti));
    return Boolean(storedHash) && storedHash === hashToken(accessToken);
  }

  async revokeSession(userId: string, jti: string): Promise<void> {
    await Promise.all([
      this.redisService.del(this.accessTokenKey(userId, jti)),
      this.redisService.del(this.refreshTokenKey(userId, jti)),
      this.redisService.zRem(this.sessionSetKey(userId), jti),
    ]);
  }

  async revokeAllSessions(userId: string): Promise<void> {
    const sessionSetKey = this.sessionSetKey(userId);
    const jtis = await this.redisService.zRange(sessionSetKey, 0, -1);
    await Promise.all(
      jtis.flatMap((jti) => [
        this.redisService.del(this.accessTokenKey(userId, jti)),
        this.redisService.del(this.refreshTokenKey(userId, jti)),
      ]),
    );
    await this.redisService.del(sessionSetKey);
  }

  async revokeOtherSessions(userId: string, keepJti: string): Promise<void> {
    const jtis = await this.redisService.zRange(this.sessionSetKey(userId), 0, -1);
    const others = jtis.filter((jti) => jti !== keepJti);
    if (others.length === 0) {
      return;
    }
    await Promise.all(
      others.flatMap((jti) => [
        this.redisService.del(this.accessTokenKey(userId, jti)),
        this.redisService.del(this.refreshTokenKey(userId, jti)),
        this.redisService.zRem(this.sessionSetKey(userId), jti),
      ]),
    );
  }

  private async issueTokens(
    userId: string,
    jti: string,
    refreshTokenTtlMs: number,
  ): Promise<SessionTokens> {
    const payload = { id: userId, jti };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signJwt(payload),
      this.jwtService.signJwt(payload, refreshTokenTtlMs),
    ]);
    const accessTokenTtlMs = this.jwtService.getAccessTokenExpiryMs();

    await Promise.all([
      // Access token is stored hashed: it's only ever compared (allowlist), never read back.
      this.redisService.set({
        key: this.accessTokenKey(userId, jti),
        value: hashToken(accessToken),
        expired: toSeconds(accessTokenTtlMs),
      }),
      // Refresh token is stored whole: rotateSession reads it back to verify the signature.
      this.redisService.set({
        key: this.refreshTokenKey(userId, jti),
        value: refreshToken,
        expired: toSeconds(refreshTokenTtlMs),
      }),
    ]);
    await this.trackSession(userId, jti, refreshTokenTtlMs);

    return { accessToken, refreshToken, accessTokenTtlMs, refreshTokenTtlMs };
  }

  private resolveRefreshTtlMs(persistence: SessionPersistence): number {
    const key = REFRESH_TTL_CONFIG_KEYS[persistence];
    return parseDurationToMs(this.configService.get<string>(key) ?? '');
  }

  private trackSession(userId: string, jti: string, refreshTokenTtlMs: number): Promise<number> {
    return this.redisService.eval(
      TRACK_SESSION_SCRIPT,
      1,
      this.sessionSetKey(userId),
      Date.now(),
      jti,
      toSeconds(refreshTokenTtlMs),
    );
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const maxSessions = this.configService.get<number>(MAX_SESSIONS_CONFIG_KEY) ?? 0;
    if (maxSessions <= 0) {
      return;
    }
    await this.redisService.eval(
      ENFORCE_LIMIT_SCRIPT,
      1,
      this.sessionSetKey(userId),
      maxSessions,
      this.accessTokenKeyPrefix(userId),
      this.refreshTokenKeyPrefix(userId),
    );
  }

  private accessTokenKey(userId: string, jti: string): string {
    return this.accessTokenKeyPrefix(userId) + jti;
  }

  private refreshTokenKey(userId: string, jti: string): string {
    return this.refreshTokenKeyPrefix(userId) + jti;
  }

  // `{userId}` hash-tag keeps every key of a user in the same Redis Cluster slot,
  // so the multi-key Lua scripts don't fail with CROSSSLOT.
  private accessTokenKeyPrefix(userId: string): string {
    return `${ACCESS_TOKEN_KEY_PREFIX}:{${userId}}:`;
  }

  private refreshTokenKeyPrefix(userId: string): string {
    return `${REFRESH_TOKEN_KEY_PREFIX}:{${userId}}:`;
  }

  private sessionSetKey(userId: string): string {
    return `${SESSION_SET_KEY_PREFIX}:{${userId}}`;
  }
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function toSeconds(milliseconds: number): number {
  return Math.floor(milliseconds / MS_PER_SECOND);
}
