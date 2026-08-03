/**
 * Managed providers hand out one connection string instead of discrete settings — Neon and Upstash
 * inject DATABASE_URL / REDIS_URL automatically, and Railway, Render, Fly and Heroku do the same.
 * These expand such a string into the variables custom-environment-variables.yml maps, so an
 * integration alone is enough to configure the app.
 *
 * A variable that is already set always wins: the URL is a fallback, never an override.
 */

const DEFAULT_POSTGRES_PORT = '5432';
const DEFAULT_REDIS_PORT = '6379';
const TLS_DISABLED_SSL_MODES: ReadonlySet<string> = new Set(['disable', 'allow', 'prefer']);

type Env = Record<string, string | undefined>;

export function applyConnectionUrls(env: Env = process.env): void {
  applyPostgresUrl(env);
  applyRedisUrl(env);
}

function applyPostgresUrl(env: Env): void {
  const url = parseUrl(env.DATABASE_URL ?? env.POSTGRES_URL);
  if (!url) {
    return;
  }

  setIfMissing(env, 'DB_HOST', url.hostname);
  setIfMissing(env, 'DB_PORT', url.port || DEFAULT_POSTGRES_PORT);
  setIfMissing(env, 'DB_USERNAME', decodeURIComponent(url.username));
  setIfMissing(env, 'DB_PASSWORD', decodeURIComponent(url.password));
  setIfMissing(env, 'DB_NAME', url.pathname.replace(/^\//, ''));

  const sslMode = url.searchParams.get('sslmode');
  if (sslMode) {
    setIfMissing(env, 'DB_TLS', String(!TLS_DISABLED_SSL_MODES.has(sslMode)));
  }
}

function applyRedisUrl(env: Env): void {
  const url = parseUrl(env.REDIS_URL);
  if (!url) {
    return;
  }

  setIfMissing(env, 'REDIS_HOST', url.hostname);
  setIfMissing(env, 'REDIS_PORT', url.port || DEFAULT_REDIS_PORT);
  setIfMissing(env, 'REDIS_PASSWORD', decodeURIComponent(url.password));
  setIfMissing(env, 'REDIS_TLS', String(url.protocol === 'rediss:'));

  const database = url.pathname.replace(/^\//, '');
  if (database) {
    setIfMissing(env, 'REDIS_DB', database);
  }
}

function parseUrl(value: string | undefined): URL | null {
  if (!value) {
    return null;
  }
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function setIfMissing(env: Env, key: string, value: string): void {
  if (env[key] === undefined && value !== '') {
    env[key] = value;
  }
}
