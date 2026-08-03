import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@org/backend-enum';
import type { Request } from 'express';
import { Repository } from 'typeorm';
import { UserSessionEntity } from '../entities/user-session.entity';
import { SessionRevokeReason } from '../enums/session-revoke-reason.enum';
import { GeoIpService } from './geo-ip.service';
import { UserSessionService } from './user-session.service';

const CHROME_WINDOWS =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function mockRequest(options: { userAgent?: string; ip?: string } = {}): Request {
  return {
    headers: options.userAgent ? { 'user-agent': options.userAgent } : {},
    ip: options.ip,
  } as unknown as Request;
}

function createQueryBuilderMock() {
  return {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(null),
    execute: jest.fn().mockResolvedValue({ affected: 0 }),
  };
}

function expectWithinMs(actual: unknown, expectedMs: number, toleranceMs = 2_000) {
  expect(actual).toBeInstanceOf(Date);
  expect(Math.abs((actual as Date).getTime() - expectedMs)).toBeLessThan(toleranceMs);
}

describe('UserSessionService', () => {
  let qb: ReturnType<typeof createQueryBuilderMock>;
  let repo: jest.Mocked<Repository<UserSessionEntity>>;
  let config: jest.Mocked<ConfigService>;
  let geoIp: jest.Mocked<GeoIpService>;
  let service: UserSessionService;

  beforeEach(() => {
    qb = createQueryBuilderMock();
    repo = {
      create: jest.fn((entity) => entity),
      save: jest.fn((entity) => Promise.resolve(entity)),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
    } as unknown as jest.Mocked<Repository<UserSessionEntity>>;

    config = {
      get: jest.fn().mockReturnValue(5),
    } as unknown as jest.Mocked<ConfigService>;

    geoIp = {
      locate: jest.fn().mockReturnValue({ country: 'VN', city: 'Hanoi' }),
    } as unknown as jest.Mocked<GeoIpService>;

    service = new UserSessionService(repo, config, geoIp);
  });

  describe('createSession', () => {
    it('persists the device, ip and an expiry derived from the refresh ttl', async () => {
      const ttl = 60_000;
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: true,
        refreshTokenTtlMs: ttl,
        request: mockRequest({ userAgent: CHROME_WINDOWS, ip: '203.0.113.5' }),
      });

      const saved = repo.create.mock.calls[0][0];
      expect(saved).toEqual(
        expect.objectContaining({
          userId: 'user-1',
          jti: 'jti-1',
          rememberMe: true,
          ipAddress: '203.0.113.5',
          country: 'VN',
          city: 'Hanoi',
          browserName: 'Chrome',
          osName: 'Windows',
          deviceType: 'Desktop',
        }),
      );
      expect(geoIp.locate).toHaveBeenCalledWith(expect.objectContaining({ ip: '203.0.113.5' }));
      expectWithinMs(saved.expiresAt, Date.now() + ttl);
    });

    it('records the auth provider, defaulting to local', async () => {
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS }),
      });
      expect(repo.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({ authProvider: AuthProvider.LOCAL }),
      );

      await service.createSession({
        userId: 'user-1',
        jti: 'jti-2',
        rememberMe: false,
        authProvider: AuthProvider.GOOGLE,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS }),
      });
      expect(repo.create.mock.calls[1][0]).toEqual(
        expect.objectContaining({ authProvider: AuthProvider.GOOGLE }),
      );
    });

    it('leaves country and city null when the ip cannot be geolocated', async () => {
      geoIp.locate.mockReturnValue({ country: null, city: null });
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS, ip: '10.0.0.1' }),
      });

      expect(repo.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({ country: null, city: null }),
      );
    });

    it('stores a null ip when the request has none', async () => {
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS }),
      });

      expect(repo.create.mock.calls[0][0].ipAddress).toBeNull();
    });

    it('leaves device fields null when no user-agent is present', async () => {
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ ip: '203.0.113.5' }),
      });

      expect(repo.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          userAgent: null,
          browserName: null,
          osName: null,
          deviceType: null,
        }),
      );
    });
  });

  describe('device parsing', () => {
    const cases: ReadonlyArray<{
      name: string;
      userAgent: string;
      browserName: string | null;
      osName: string | null;
      deviceType: string | null;
    }> = [
      {
        name: 'Chrome on Windows desktop',
        userAgent: CHROME_WINDOWS,
        browserName: 'Chrome',
        osName: 'Windows',
        deviceType: 'Desktop',
      },
      {
        name: 'Firefox on Linux desktop',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
        browserName: 'Firefox',
        osName: 'Linux',
        deviceType: 'Desktop',
      },
      {
        name: 'Safari on macOS desktop',
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        browserName: 'Safari',
        osName: 'macOS',
        deviceType: 'Desktop',
      },
      {
        name: 'Edge on Windows desktop',
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
        browserName: 'Edge',
        osName: 'Windows',
        deviceType: 'Desktop',
      },
      {
        name: 'Safari on iPhone',
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        browserName: 'Safari',
        osName: 'iOS',
        deviceType: 'Mobile',
      },
      {
        name: 'Chrome on Android phone',
        userAgent:
          'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        browserName: 'Chrome',
        osName: 'Android',
        deviceType: 'Mobile',
      },
      {
        name: 'Safari on iPad tablet',
        userAgent:
          'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        browserName: 'Safari',
        osName: 'iOS',
        deviceType: 'Tablet',
      },
    ];

    it.each(cases)('parses $name', async ({ userAgent, browserName, osName, deviceType }) => {
      await service.createSession({
        userId: 'user-1',
        jti: 'jti-1',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent }),
      });

      expect(repo.create.mock.calls[0][0]).toEqual(
        expect.objectContaining({ browserName, osName, deviceType }),
      );
    });
  });

  describe('touchSession', () => {
    it('refreshes lastSeenAt, ip and extends expiresAt by the new refresh ttl', async () => {
      const ttl = 120_000;
      await service.touchSession('user-1', 'jti-1', mockRequest({ ip: '198.51.100.7' }), ttl);

      const [criteria, patch] = repo.update.mock.calls[0];
      expect(criteria).toEqual({ userId: 'user-1', jti: 'jti-1' });
      expect(patch).toEqual(
        expect.objectContaining({
          ipAddress: '198.51.100.7',
          country: 'VN',
          city: 'Hanoi',
          lastSeenAt: expect.any(Date),
        }),
      );
      expectWithinMs((patch as { expiresAt: Date }).expiresAt, Date.now() + ttl);
    });
  });

  describe('listActiveSessions', () => {
    it('maps sessions and flags the one matching the current jti', async () => {
      qb.getMany.mockResolvedValue([
        { id: 's1', jti: 'current', ipAddress: '1.1.1.1', country: 'VN', city: 'Hanoi' },
        { id: 's2', jti: 'other', ipAddress: '2.2.2.2', country: null, city: null },
      ]);

      const result = await service.listActiveSessions('user-1', 'current');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({ id: 's1', country: 'VN', city: 'Hanoi', isCurrent: true }),
      );
      expect(result[1]).toEqual(expect.objectContaining({ id: 's2', isCurrent: false }));
    });
  });

  describe('getActiveSessionOrFail', () => {
    it('returns the active session when found', async () => {
      const session = { id: 's1', jti: 'jti-1' };
      qb.getOne.mockResolvedValue(session);

      await expect(service.getActiveSessionOrFail('user-1', 's1')).resolves.toBe(session);
    });

    it('throws NotFoundException when no active session matches', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.getActiveSessionOrFail('user-1', 'missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('revoke', () => {
    it('revokeSession marks the row revoked with the default logout reason', async () => {
      await service.revokeSession('user-1', 'jti-1');

      expect(repo.update).toHaveBeenCalledWith(
        { userId: 'user-1', jti: 'jti-1' },
        expect.objectContaining({
          revokedAt: expect.any(Date),
          revokeReason: SessionRevokeReason.LOGOUT,
        }),
      );
    });

    it('revokeSession honours an explicit reason', async () => {
      await service.revokeSession('user-1', 'jti-1', SessionRevokeReason.REVOKED_BY_USER);

      expect(repo.update).toHaveBeenCalledWith(
        { userId: 'user-1', jti: 'jti-1' },
        expect.objectContaining({ revokeReason: SessionRevokeReason.REVOKED_BY_USER }),
      );
    });

    it('revokeAllSessions revokes every active row for the user', async () => {
      await service.revokeAllSessions('user-1');

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ revokeReason: SessionRevokeReason.LOGOUT_ALL }),
      );
      expect(qb.where).toHaveBeenCalledWith('user_id = :userId', { userId: 'user-1' });
    });

    it('revokeOtherSessions keeps the current session', async () => {
      await service.revokeOtherSessions('user-1', 'keep');

      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ revokeReason: SessionRevokeReason.SECURITY }),
      );
      expect(qb.andWhere).toHaveBeenCalledWith('jti != :keepJti', { keepJti: 'keep' });
    });
  });

  describe('session limit enforcement', () => {
    it('revokes the oldest sessions beyond the configured maximum', async () => {
      config.get.mockReturnValue(2);
      qb.getMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }, { id: 's4' }]);

      await service.createSession({
        userId: 'user-1',
        jti: 'jti-new',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS }),
      });

      expect(qb.where).toHaveBeenCalledWith('id IN (:...revokeIds)', { revokeIds: ['s1', 's2'] });
      expect(qb.set).toHaveBeenCalledWith(
        expect.objectContaining({ revokeReason: SessionRevokeReason.SESSION_LIMIT }),
      );
    });

    it('does nothing when the limit is disabled', async () => {
      config.get.mockReturnValue(0);

      await service.createSession({
        userId: 'user-1',
        jti: 'jti-new',
        rememberMe: false,
        refreshTokenTtlMs: 1_000,
        request: mockRequest({ userAgent: CHROME_WINDOWS }),
      });

      expect(qb.getMany).not.toHaveBeenCalled();
    });
  });
});
