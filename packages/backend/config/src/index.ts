import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { applyConnectionUrls } from './connection-urls';

export { applyConnectionUrls } from './connection-urls';

const nodeEnv = process.env.NODE_ENV || 'development';
const backendRoot = resolveBackendRoot();
const configDir = join(backendRoot, 'config');

// .env.example is documentation, not configuration: it is committed with localhost defaults,
// and loading it would override production.yml wherever a variable is left unset.
export const envFilePaths = [
  join(backendRoot, `.env.${nodeEnv}`),
  join(backendRoot, '.env.local'),
  join(backendRoot, '.env'),
  `.env.${nodeEnv}`,
  '.env.local',
  '.env',
];

dotenv.config({
  path: envFilePaths,
});

applyConnectionUrls();

process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || configDir;

const nodeConfig = require('config') as ConfigReader;

interface ConfigReader {
  get<T>(key: string): T;
}

interface AppConfig {
  /** Shown as the issuer in authenticator apps, so it has to name the product. */
  name: string;
  port: number | string;
  nodeEnv: string;
  url: string;
  logLevels: string[] | string;
  trustProxy: number;
}

interface DatabaseConfig {
  username: string;
  password: string;
  database: string;
  tls: boolean;
  primary: {
    host: string;
    port: number | string;
  };
  replicas: Array<{
    host: string;
    port: number | string;
  }>;
  log: {
    enabled: boolean;
  };
}

interface RedisConfig {
  cluster: boolean;
  password?: string;
  tls: boolean;
  host: string;
  port: number | string;
  db: number | string;
}

interface JwtConfig {
  secret: string;
  accessTokenExpiresIn: string;
}

interface SessionConfig {
  maxSessionsPerUser: number;
  refreshTtl: string;
  refreshTtlRemember: string;
  refreshTtlOauth: string;
}

interface CryptoConfig {
  secretKey: string;
}

interface SentryConfig {
  dsn: string;
  tracesSampleRate: number;
}

interface EmailConfig {
  resendApiKey: string;
  from: string;
}

interface CaptchaConfig {
  enabled: boolean;
  secretKey: string;
}

interface GoogleConfig {
  clientId: string;
}

const stringListSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean)
      : value,
  z.array(z.string().min(1)),
);

const durationSchema = z.string().regex(/^\d+(s|m|h|d)$/, 'Expected a duration like 15m, 1d, 60d');

const backendConfigSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    port: z.coerce.number().int().positive(),
    nodeEnv: z.string().min(1),
    url: z.string().min(1),
    logLevels: stringListSchema,
    trustProxy: z.coerce.number().int().min(0).default(0),
  }),
  db: z.object({
    username: z.string().min(1),
    password: z.string(),
    database: z.string().min(1),
    tls: z.boolean(),
    primary: z.object({
      host: z.string().min(1),
      port: z.coerce.number().int().positive(),
    }),
    replicas: z.array(
      z.object({
        host: z.string().min(1),
        port: z.coerce.number().int().positive(),
      }),
    ),
    log: z.object({
      enabled: z.boolean(),
    }),
  }),
  redis: z.object({
    cluster: z.boolean(),
    password: z.string().optional().default(''),
    tls: z.boolean(),
    host: z.string().min(1),
    port: z.coerce.number().int().positive(),
    db: z.coerce.number().int().min(0),
  }),
  cors: z.object({
    origins: stringListSchema,
  }),
  jwt: z.object({
    secret: z.string().min(1),
    accessTokenExpiresIn: durationSchema,
  }),
  session: z.object({
    maxSessionsPerUser: z.coerce.number().int().positive(),
    refreshTtl: durationSchema,
    refreshTtlRemember: durationSchema,
    refreshTtlOauth: durationSchema,
  }),
  crypto: z.object({
    secretKey: z.string().min(32),
  }),
  sentry: z.object({
    dsn: z.string().default(''),
    tracesSampleRate: z.coerce.number().min(0).max(1),
  }),
  email: z.object({
    resendApiKey: z.string().default(''),
    from: z.string().min(1),
  }),
  captcha: z.object({
    enabled: z.boolean().default(false),
    secretKey: z.string().default(''),
  }),
  google: z.object({
    clientId: z.string().default(''),
  }),
});

function resolveBackendRoot() {
  const candidates = [join(process.cwd(), 'apps/backend'), process.cwd(), join(__dirname, '..')];

  const backendRoot = candidates.find((candidate) =>
    existsSync(join(candidate, 'config/default.yml')),
  );

  return backendRoot || join(process.cwd(), 'apps/backend');
}

function toNumber(value: number | string) {
  return typeof value === 'number' ? value : Number(value);
}

function toLogLevels(value: string[] | string) {
  return Array.isArray(value)
    ? value
    : value
        .split(',')
        .map((level) => level.trim())
        .filter(Boolean);
}

export default () => {
  const validated = backendConfigSchema.parse({
    app: nodeConfig.get<AppConfig>('app'),
    db: nodeConfig.get<DatabaseConfig>('db'),
    redis: nodeConfig.get<RedisConfig>('redis'),
    cors: nodeConfig.get<{ origins: string[] | string }>('cors'),
    jwt: nodeConfig.get<JwtConfig>('jwt'),
    session: nodeConfig.get<SessionConfig>('session'),
    crypto: nodeConfig.get<CryptoConfig>('crypto'),
    sentry: nodeConfig.get<SentryConfig>('sentry'),
    email: nodeConfig.get<EmailConfig>('email'),
    captcha: nodeConfig.get<CaptchaConfig>('captcha'),
    google: nodeConfig.get<GoogleConfig>('google'),
  });

  const { app, db, redis, cors, jwt, session, crypto, sentry, email, captcha, google } = validated;

  return {
    app: {
      ...app,
      logLevels: toLogLevels(app.logLevels),
    },
    db: {
      ...db,
      primary: {
        ...db.primary,
        port: toNumber(db.primary.port),
      },
      replicas: db.replicas.map((replica) => ({
        ...replica,
        port: toNumber(replica.port),
      })),
    },
    database: {
      host: db.primary.host,
      port: toNumber(db.primary.port),
      username: db.username,
      password: db.password,
      database: db.database,
      tls: db.tls,
    },
    redis: {
      ...redis,
      password: redis.password || undefined,
    },
    cors,
    jwt,
    session,
    crypto,
    sentry,
    email,
    captcha,
    google,
  };
};
