import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

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
  const app = nodeConfig.get<AppConfig>('app');
  const db = nodeConfig.get<DatabaseConfig>('db');
  const redis = nodeConfig.get<RedisConfig>('redis');
  const jwt = nodeConfig.get<JwtConfig>('jwt');
  const crypto = nodeConfig.get<CryptoConfig>('crypto');

  return {
    app: {
      ...app,
      port: toNumber(app.port),
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
      port: toNumber(redis.port),
      db: toNumber(redis.db),
      password: redis.password || undefined,
    },
    jwt,
    crypto,
  };
};
