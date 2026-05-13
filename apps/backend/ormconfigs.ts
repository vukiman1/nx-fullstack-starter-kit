import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';
import { UserEntity } from './src/api/user/entities/user.entity';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}

const backendRoot = resolveBackendRoot();
const nodeEnv = process.env.NODE_ENV || 'development';

dotenv.config({
  path: [
    join(backendRoot, `.env.${nodeEnv}`),
    join(backendRoot, '.env.local'),
    join(backendRoot, '.env'),
    join(backendRoot, '.env.example'),
    `.env.${nodeEnv}`,
    '.env.local',
    '.env',
    '.env.example',
  ],
});

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
  entities: [UserEntity],
  migrationsTableName: 'migrations',
  migrations: [join(__dirname, `src/migrations/*.${migrationExtension}`)],
  synchronize: false,
};

export const AppDataSource = new DataSource(options);

function resolveBackendRoot() {
  const candidates = [
    join(process.cwd(), 'apps/backend'),
    process.cwd(),
    join(__dirname, '..'),
  ];

  return (
    candidates.find((candidate) =>
      existsSync(join(candidate, '.env.example')),
    ) || join(process.cwd(), 'apps/backend')
  );
}
