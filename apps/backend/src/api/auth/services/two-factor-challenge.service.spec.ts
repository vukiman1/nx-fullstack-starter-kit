import { RedisService } from '@org/backend-redis';
import { TwoFactorChallengeService } from './two-factor-challenge.service';

/** A Map stands in for Redis so the attempt counter is exercised for real, not asserted on calls. */
function buildRedis() {
  const store = new Map<string, string>();
  return {
    store,
    service: {
      set: jest.fn(async ({ key, value }: { key: string; value: string }) => {
        store.set(key, value);
      }),
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      del: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    } as unknown as RedisService,
  };
}

describe('TwoFactorChallengeService', () => {
  let redis: ReturnType<typeof buildRedis>;
  let service: TwoFactorChallengeService;

  beforeEach(() => {
    redis = buildRedis();
    service = new TwoFactorChallengeService(redis.service);
  });

  it('hands out unguessable tokens', async () => {
    const first = await service.issue('user-1', false);
    const second = await service.issue('user-1', false);

    expect(first).toHaveLength(64);
    expect(first).not.toBe(second);
  });

  it('remembers who the challenge belongs to and their rememberMe choice', async () => {
    const token = await service.issue('user-1', true);

    await expect(service.peek(token)).resolves.toEqual({ userId: 'user-1', rememberMe: true });
  });

  it('never leaks the attempt counter to callers', async () => {
    const token = await service.issue('user-1', false);

    const claim = await service.peek(token);

    expect(claim).not.toHaveProperty('attempts');
  });

  it('destroys the challenge on the fifth wrong code', async () => {
    const token = await service.issue('user-1', false);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(service.recordFailure(token)).resolves.toBe(true);
    }

    await expect(service.recordFailure(token)).resolves.toBe(false);
    await expect(service.peek(token)).resolves.toBeNull();
  });

  it('treats an unknown token as already spent', async () => {
    await expect(service.recordFailure('never-issued')).resolves.toBe(false);
    await expect(service.peek('never-issued')).resolves.toBeNull();
  });

  it('cannot be reused once consumed', async () => {
    const token = await service.issue('user-1', false);

    await service.consume(token);

    await expect(service.peek(token)).resolves.toBeNull();
  });

  it('expires on its own so an abandoned attempt does not linger', async () => {
    await service.issue('user-1', false);

    const [{ expired }] = (redis.service.set as jest.Mock).mock.calls[0];
    expect(expired).toBe(300);
  });
});
