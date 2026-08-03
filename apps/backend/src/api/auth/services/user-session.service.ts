import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { AuthProvider } from '@org/backend-enum';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { UserSessionEntity } from '../entities/user-session.entity';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { GeoIpService } from './geo-ip.service';

const MAX_SESSIONS_CONFIG_KEY = 'session.maxSessionsPerUser';

export type UserSessionSummary = {
  id: string;
  ipAddress: string | null;
  country: string | null;
  city: string | null;
  userAgent: string | null;
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
  rememberMe: boolean;
  authProvider: AuthProvider;
  lastSeenAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  isCurrent: boolean;
};

type CreateUserSessionParams = {
  userId: string;
  jti: string;
  rememberMe: boolean;
  authProvider?: AuthProvider;
  refreshTokenTtlMs: number;
  request: Request;
};

@Injectable()
export class UserSessionService {
  constructor(
    @InjectRepository(UserSessionEntity)
    private readonly sessionRepo: Repository<UserSessionEntity>,
    private readonly configService: ConfigService,
    private readonly geoIpService: GeoIpService,
  ) {}

  async createSession({
    userId,
    jti,
    rememberMe,
    authProvider = AuthProvider.LOCAL,
    refreshTokenTtlMs,
    request,
  }: CreateUserSessionParams): Promise<UserSessionEntity> {
    const userAgent = headerValue(request.headers['user-agent']);
    const device = parseDevice(userAgent);
    const ip = clientIp(request);
    const geo = this.geoIpService.locate(request);
    const now = new Date();
    const session = await this.sessionRepo.save(
      this.sessionRepo.create({
        userId,
        jti,
        rememberMe,
        authProvider,
        ipAddress: ip,
        country: geo.country,
        city: geo.city,
        userAgent,
        browserName: device.browserName,
        osName: device.osName,
        deviceType: device.deviceType,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + refreshTokenTtlMs),
      }),
    );

    await this.enforceSessionLimit(userId);
    return session;
  }

  async touchSession(
    userId: string,
    jti: string,
    request: Request,
    refreshTokenTtlMs: number,
  ): Promise<void> {
    const ip = clientIp(request);
    const geo = this.geoIpService.locate(request);
    const now = new Date();
    await this.sessionRepo.update(
      { userId, jti },
      {
        ipAddress: ip,
        country: geo.country,
        city: geo.city,
        lastSeenAt: now,
        expiresAt: new Date(now.getTime() + refreshTokenTtlMs),
      },
    );
  }

  async listActiveSessions(userId: string, currentJti: string): Promise<UserSessionSummary[]> {
    const sessions = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .orderBy('session.last_seen_at', 'DESC', 'NULLS LAST')
      .addOrderBy('session.created_at', 'DESC')
      .getMany();

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      country: session.country,
      city: session.city,
      userAgent: session.userAgent,
      browserName: session.browserName,
      osName: session.osName,
      deviceType: session.deviceType,
      rememberMe: session.rememberMe,
      authProvider: session.authProvider,
      lastSeenAt: session.lastSeenAt,
      expiresAt: session.expiresAt,
      createdAt: session.createdAt,
      isCurrent: session.jti === currentJti,
    }));
  }

  async getActiveSessionOrFail(userId: string, sessionId: string): Promise<UserSessionEntity> {
    const session = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.id = :sessionId', { sessionId })
      .andWhere('session.user_id = :userId', { userId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .getOne();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async revokeSession(
    userId: string,
    jti: string,
    reason: SessionRevokeReason = SessionRevokeReason.LOGOUT,
  ): Promise<void> {
    await this.sessionRepo.update({ userId, jti }, { revokedAt: new Date(), revokeReason: reason });
  }

  async revokeAllSessions(
    userId: string,
    reason: SessionRevokeReason = SessionRevokeReason.LOGOUT_ALL,
  ): Promise<void> {
    await this.sessionRepo
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ revokedAt: new Date(), revokeReason: reason })
      .where('user_id = :userId', { userId })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  async revokeOtherSessions(
    userId: string,
    keepJti: string,
    reason: SessionRevokeReason = SessionRevokeReason.SECURITY,
  ): Promise<void> {
    await this.sessionRepo
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ revokedAt: new Date(), revokeReason: reason })
      .where('user_id = :userId', { userId })
      .andWhere('jti != :keepJti', { keepJti })
      .andWhere('revoked_at IS NULL')
      .execute();
  }

  private async enforceSessionLimit(userId: string): Promise<void> {
    const maxSessions = this.configService.get<number>(MAX_SESSIONS_CONFIG_KEY) ?? 0;
    if (maxSessions <= 0) {
      return;
    }

    const activeSessions = await this.sessionRepo
      .createQueryBuilder('session')
      .where('session.user_id = :userId', { userId })
      .andWhere('session.revoked_at IS NULL')
      .andWhere('session.expires_at > :now', { now: new Date() })
      .orderBy('session.created_at', 'ASC')
      .getMany();

    const excess = activeSessions.length - maxSessions;
    if (excess <= 0) {
      return;
    }

    const revokeIds = activeSessions.slice(0, excess).map((session) => session.id);
    await this.sessionRepo
      .createQueryBuilder()
      .update(UserSessionEntity)
      .set({ revokedAt: new Date(), revokeReason: SessionRevokeReason.SESSION_LIMIT })
      .where('id IN (:...revokeIds)', { revokeIds })
      .execute();
  }
}

function clientIp(request: Request): string | null {
  return request.ip ?? null;
}

function headerValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function parseDevice(userAgent: string | null): {
  browserName: string | null;
  osName: string | null;
  deviceType: string | null;
} {
  if (!userAgent) {
    return { browserName: null, osName: null, deviceType: null };
  }

  return {
    browserName: parseBrowser(userAgent),
    osName: parseOs(userAgent),
    deviceType: parseDeviceType(userAgent),
  };
}

function parseBrowser(userAgent: string): string | null {
  if (/Edg\//.test(userAgent)) return 'Edge';
  if (/Chrome\//.test(userAgent) && !/Chromium\//.test(userAgent)) return 'Chrome';
  if (/Firefox\//.test(userAgent)) return 'Firefox';
  if (/Safari\//.test(userAgent) && /Version\//.test(userAgent)) return 'Safari';
  return null;
}

function parseOs(userAgent: string): string | null {
  if (/Windows NT/.test(userAgent)) return 'Windows';
  if (/Mac OS X/.test(userAgent) && !/Mobile\//.test(userAgent)) return 'macOS';
  if (/iPhone|iPad|iPod/.test(userAgent)) return 'iOS';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Linux/.test(userAgent)) return 'Linux';
  return null;
}

function parseDeviceType(userAgent: string): string | null {
  if (/iPad|Tablet/.test(userAgent)) return 'Tablet';
  if (/Mobile|Android|iPhone|iPod/.test(userAgent)) return 'Mobile';
  return 'Desktop';
}
