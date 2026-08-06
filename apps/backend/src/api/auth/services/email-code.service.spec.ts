import { RedisService } from '@org/backend-redis';
import { EmailCodeKind, EmailCodeService } from './email-code.service';

/** A Map stands in for Redis so the attempt counter runs for real rather than being asserted on. */
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

const KIND = EmailCodeKind.EMAIL_VERIFY;
const TTL = 600_000;

describe('EmailCodeService', () => {
  let redis: ReturnType<typeof buildRedis>;
  let service: EmailCodeService;

  beforeEach(() => {
    redis = buildRedis();
    service = new EmailCodeService(redis.service);
  });

  it('issues six digits, which is what a person can retype from an email', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    expect(code).toMatch(/^\d{6}$/);
  });

  it('accepts the code it issued', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    await expect(service.consume(KIND, 'u1', code)).resolves.toBe('u1');
  });

  it('never stores the code itself', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    expect([...redis.store.values()].join()).not.toContain(code);
  });

  it('spends the code, so it cannot be replayed', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    await service.consume(KIND, 'u1', code);

    await expect(service.consume(KIND, 'u1', code)).resolves.toBeNull();
  });

  it('destroys the code after five wrong guesses', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await expect(service.consume(KIND, 'u1', '000000')).resolves.toBeNull();
    }
    await service.consume(KIND, 'u1', '000000');

    // Even the right code is gone now — a million guesses are no longer reachable.
    await expect(service.consume(KIND, 'u1', code)).resolves.toBeNull();
  });

  it('keeps kinds apart, so a verification code cannot reset a password', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    await expect(service.consume(EmailCodeKind.PASSWORD_RESET, 'u1', code)).resolves.toBeNull();
  });

  it('keeps users apart', async () => {
    const code = await service.issue(KIND, 'u1', TTL);

    await expect(service.consume(KIND, 'u2', code)).resolves.toBeNull();
  });

  it('replaces the previous code when a new one is asked for', async () => {
    const first = await service.issue(KIND, 'u1', TTL);
    const second = await service.issue(KIND, 'u1', TTL);

    await expect(service.consume(KIND, 'u1', first)).resolves.toBeNull();
    await expect(service.consume(KIND, 'u1', second)).resolves.toBe('u1');
  });
});
