import { waitForPortOpen } from '@nx/node/utils';
import { spawn, spawnSync } from 'child_process';
import { mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const runtimeFile = join(process.cwd(), 'tmp', 'backend-e2e-runtime.json');

module.exports = async function () {
  console.log('\nSetting up...\n');

  const host = process.env.HOST ?? 'localhost';
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const dbContainerName = process.env.DB_CONTAINER_NAME ?? 'nx-starter-e2e-db';
  const redisContainerName =
    process.env.REDIS_CONTAINER_NAME ?? 'nx-starter-e2e-redis';
  const dbPort = process.env.DB_PORT ?? '15432';
  const redisPort = process.env.REDIS_PORT ?? '16379';
  const dbName = process.env.DB_NAME ?? 'nestdb_e2e';
  const dbUsername = process.env.DB_USERNAME ?? 'postgres';
  const dbPassword = process.env.DB_PASSWORD ?? 'password';
  const env = {
    ...process.env,
    COMPOSE_PROJECT_NAME:
      process.env.COMPOSE_PROJECT_NAME ?? 'nx-fullstack-starter-e2e',
    NODE_ENV: 'test',
    PORT: String(port),
    DB_CONTAINER_NAME: dbContainerName,
    REDIS_CONTAINER_NAME: redisContainerName,
    DB_HOST_PORT: dbPort,
    REDIS_HOST_PORT: redisPort,
    DB_DATA_PATH: process.env.DB_DATA_PATH ?? './tmp/backend-e2e/postgres',
    REDIS_DATA_PATH: process.env.REDIS_DATA_PATH ?? './tmp/backend-e2e/redis',
    POSTGRES_USER: process.env.POSTGRES_USER ?? dbUsername,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD ?? dbPassword,
    POSTGRES_DB: process.env.POSTGRES_DB ?? dbName,
    DB_HOST: process.env.DB_HOST ?? 'localhost',
    DB_PORT: dbPort,
    DB_USERNAME: dbUsername,
    DB_PASSWORD: dbPassword,
    DB_NAME: dbName,
    REDIS_HOST: process.env.REDIS_HOST ?? 'localhost',
    REDIS_PORT: redisPort,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD ?? '',
    CORS_ORIGINS: process.env.CORS_ORIGINS ?? 'http://localhost:4200',
  };

  try {
    run('docker', ['compose', 'up', '-d', 'db', 'redis'], env);
    await waitForDockerHealth(dbContainerName, env);
    await waitForDockerHealth(redisContainerName, env);
    run('pnpm', ['db:migration:run'], env);
    run('node', ['tools/backend-e2e-seed.mjs'], env);

    const backend = spawn('node', ['apps/backend/dist/main.js'], {
      cwd: process.cwd(),
      env,
      detached: true,
      stdio: 'ignore',
    });
    backend.unref();

    mkdirSync(dirname(runtimeFile), { recursive: true });
    writeFileSync(
      runtimeFile,
      JSON.stringify({
        env: pickRuntimeEnv(env),
        pid: backend.pid,
        port,
        teardownMessage: '\nTearing down...\n',
      }),
    );

    await waitForPortOpen(port, { host });
  } catch (error) {
    spawnSync('docker', ['compose', 'down'], {
      cwd: process.cwd(),
      env,
      stdio: 'inherit',
    });
    throw error;
  }
};

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed`);
  }
}

async function waitForDockerHealth(
  containerName: string,
  env: NodeJS.ProcessEnv,
) {
  const deadline = Date.now() + 60_000;

  while (Date.now() < deadline) {
    const result = spawnSync(
      'docker',
      ['inspect', '-f', '{{.State.Health.Status}}', containerName],
      {
        cwd: process.cwd(),
        env,
        encoding: 'utf8',
      },
    );

    if (result.stdout.trim() === 'healthy') return;

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`${containerName} did not become healthy in time`);
}

function pickRuntimeEnv(env: NodeJS.ProcessEnv) {
  const keys = [
    'COMPOSE_PROJECT_NAME',
    'DB_CONTAINER_NAME',
    'REDIS_CONTAINER_NAME',
    'DB_HOST_PORT',
    'REDIS_HOST_PORT',
    'DB_DATA_PATH',
    'REDIS_DATA_PATH',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ];

  return Object.fromEntries(
    keys.flatMap((key) => (env[key] ? [[key, env[key]]] : [])),
  );
}
