import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const nodeEnv = process.env.NODE_ENV || 'development';
const backendRoot = resolveBackendRoot();
const configDir = join(backendRoot, 'config');

export const envFilePaths = [
  join(backendRoot, `.env.${nodeEnv}`),
  join(backendRoot, '.env.local'),
  join(backendRoot, '.env'),
  `.env.${nodeEnv}`,
  '.env.local',
  '.env',
  join(backendRoot, '.env.example'),
  '.env.example',
];

dotenv.config({
  path: envFilePaths,
});

process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || configDir;

const nodeConfig = require('config') as ConfigReader;

interface ConfigReader {
  get<T>(key: string): T;
}

interface AppConfig {
  port: number | string;
  nodeEnv: string;
  logLevels: string[] | string;
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
  refreshTokenExpiresIn: string;
  accessTokenExpiresIn: string;
}

interface CryptoConfig {
  secretKey: string;
  secretKeyIv: string;
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

const backendConfigSchema = z.object({
  app: z.object({
    port: z.coerce.number().int().positive(),
    nodeEnv: z.string().min(1),
    logLevels: stringListSchema,
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
    refreshTokenExpiresIn: z.string().min(1),
    accessTokenExpiresIn: z.string().min(1),
  }),
  crypto: z.object({
    secretKey: z.string().min(32),
    secretKeyIv: z.string().min(16),
  }),
});

function resolveBackendRoot() {
  const candidates = [
    join(process.cwd(), 'apps/backend'),
    process.cwd(),
    join(__dirname, '..'),
  ];

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
    crypto: nodeConfig.get<CryptoConfig>('crypto'),
  });

  const { app, db, redis, cors, jwt, crypto } = validated;

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
    },
    redis: {
      ...redis,
      password: redis.password || undefined,
    },
    cors,
    jwt,
    crypto,
  };
};
