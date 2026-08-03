import { applyConnectionUrls } from './connection-urls';

describe('applyConnectionUrls', () => {
  it('expands a Neon pooler URL into the discrete database settings', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL:
        'postgresql://neondb_owner:secret@ep-x-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
    };

    applyConnectionUrls(env);

    expect(env).toMatchObject({
      DB_HOST: 'ep-x-pooler.ap-southeast-1.aws.neon.tech',
      DB_PORT: '5432',
      DB_USERNAME: 'neondb_owner',
      DB_PASSWORD: 'secret',
      DB_NAME: 'neondb',
      DB_TLS: 'true',
    });
  });

  it('expands an Upstash URL and turns TLS on for the rediss scheme', () => {
    const env: Record<string, string | undefined> = {
      REDIS_URL: 'rediss://default:token@outgoing-drake.upstash.io:6379',
    };

    applyConnectionUrls(env);

    expect(env).toMatchObject({
      REDIS_HOST: 'outgoing-drake.upstash.io',
      REDIS_PORT: '6379',
      REDIS_PASSWORD: 'token',
      REDIS_TLS: 'true',
    });
  });

  it('leaves TLS off for a plain redis scheme', () => {
    const env: Record<string, string | undefined> = { REDIS_URL: 'redis://localhost:6379' };
    applyConnectionUrls(env);
    expect(env.REDIS_TLS).toBe('false');
  });

  it('never overrides a variable that was set explicitly', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: 'postgresql://user:pw@from-url:5432/db?sslmode=require',
      DB_HOST: 'set-by-hand',
    };

    applyConnectionUrls(env);

    expect(env.DB_HOST).toBe('set-by-hand');
    expect(env.DB_NAME).toBe('db');
  });

  it('decodes credentials that were percent-encoded in the URL', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: 'postgresql://user%40org:p%40ss%3Aword@host:5432/db',
    };

    applyConnectionUrls(env);

    expect(env.DB_USERNAME).toBe('user@org');
    expect(env.DB_PASSWORD).toBe('p@ss:word');
  });

  it('treats sslmode=disable as TLS off', () => {
    const env: Record<string, string | undefined> = {
      DATABASE_URL: 'postgresql://user:pw@host:5432/db?sslmode=disable',
    };
    applyConnectionUrls(env);
    expect(env.DB_TLS).toBe('false');
  });

  it('ignores a malformed URL instead of throwing', () => {
    const env: Record<string, string | undefined> = { DATABASE_URL: 'not-a-url' };
    expect(() => applyConnectionUrls(env)).not.toThrow();
    expect(env.DB_HOST).toBeUndefined();
  });

  it('does nothing when no connection URL is present', () => {
    const env: Record<string, string | undefined> = {};
    applyConnectionUrls(env);
    expect(env).toEqual({});
  });
});
