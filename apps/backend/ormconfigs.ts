import { DataSource, DataSourceOptions } from 'typeorm';
import { applyConnectionUrls } from '@org/backend-config';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { UserEntity } from './src/api/user/entities/user.entity';
import { UserSessionEntity } from './src/api/auth/entities/user-session.entity';
import { UserTotpEntity } from './src/api/auth/entities/user-totp.entity';
import { UserRecoveryCodeEntity } from './src/api/auth/entities/user-recovery-code.entity';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const backendRoot = resolveBackendRoot();
const nodeEnv = process.env.NODE_ENV || 'development';

// Before the files are read, so a DATABASE_URL on the command line wins: dotenv never overwrites
// what is already set, and filling DB_* from a file first would send a production migration to
// whatever database the local files point at.
applyConnectionUrls();

// .env.example is deliberately absent: it pins DB_* to localhost and would override the call
// above. Defaults belong in config/default.yml.
dotenv.config({
  path: [
    join(backendRoot, `.env.${nodeEnv}`),
    join(backendRoot, '.env.local'),
    join(backendRoot, '.env'),
    `.env.${nodeEnv}`,
    '.env.local',
    '.env',
  ],
});

// A DATABASE_URL that came from one of those files still needs expanding.
applyConnectionUrls();

const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'nestdb',
};

const isTsRuntime = __filename.endsWith('.ts');
const migrationExtension = isTsRuntime ? 'ts' : 'js';

export const options: DataSourceOptions = {
  type: 'postgres',
  ...dbConfig,
  // Hosted Postgres refuses plaintext connections, so without this migrations cannot connect.
  ssl: process.env.DB_TLS === 'true' ? { rejectUnauthorized: false } : false,
  entities: [UserEntity, UserSessionEntity, UserTotpEntity, UserRecoveryCodeEntity],
  migrationsTableName: 'migrations',
  migrations: [join(__dirname, `src/migrations/*.${migrationExtension}`)],
  synchronize: false,
};

export const AppDataSource = new DataSource(options);

function resolveBackendRoot() {
  const candidates = [join(process.cwd(), 'apps/backend'), process.cwd(), join(__dirname, '..')];

  return (
    candidates.find((candidate) => existsSync(join(candidate, 'config/default.yml'))) ||
    join(process.cwd(), 'apps/backend')
  );
}
