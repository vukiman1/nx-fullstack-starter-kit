import { RedisService } from '@org/backend-redis';
import { AuthTokenService, OneTimeTokenKind } from './auth-token.service';

describe('AuthTokenService', () => {
  let redis: jest.Mocked<RedisService>;
  let service: AuthTokenService;

  beforeEach(() => {
    redis = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
    } as unknown as jest.Mocked<RedisService>;
    service = new AuthTokenService(redis);
  });

  describe('issue', () => {
    it('stores a random hex token keyed by kind with the user id and a TTL in seconds', async () => {
      const token = await service.issue(OneTimeTokenKind.EMAIL_VERIFY, 'user-1', 60_000);

      expect(token).toMatch(/^[a-f0-9]{64}$/);
      expect(redis.set).toHaveBeenCalledWith({
        key: `EMAIL_VERIFY:${token}`,
        value: 'user-1',
        expired: 60,
      });
    });
  });

  describe('consume', () => {
    it('returns the user id and deletes the token so it is single-use', async () => {
      redis.get.mockResolvedValue('user-1');

      const userId = await service.consume(OneTimeTokenKind.PASSWORD_RESET, 'tok');

      expect(userId).toBe('user-1');
      expect(redis.del).toHaveBeenCalledWith('PASSWORD_RESET:tok');
    });

    it('returns null and deletes nothing when the token is unknown', async () => {
      redis.get.mockResolvedValue(null);

      const userId = await service.consume(OneTimeTokenKind.PASSWORD_RESET, 'tok');

      expect(userId).toBeNull();
      expect(redis.del).not.toHaveBeenCalled();
    });
  });
});
