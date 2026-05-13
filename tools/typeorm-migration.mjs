#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const action = process.argv[2];
const args = process.argv.slice(3);
const backendRoot = join(process.cwd(), 'apps/backend');
const migrationsDir = join(backendRoot, 'src/migrations');
const dataSource = join(backendRoot, 'ormconfigs.ts');

if (!action) {
  fail('Missing action. Use create, generate, run, revert, or show.');
}

mkdirSync(migrationsDir, { recursive: true });

const commands = {
  create: () => ['migration:create', migrationPath(requiredName())],
  generate: () => [
    '-d',
    dataSource,
    'migration:generate',
    migrationPath(requiredName()),
  ],
  run: () => ['-d', dataSource, 'migration:run'],
  revert: () => ['-d', dataSource, 'migration:revert'],
  show: () => ['-d', dataSource, 'migration:show'],
};

if (!commands[action]) {
  fail(
    `Unknown action "${action}". Use create, generate, run, revert, or show.`,
  );
}

if (!existsSync(dataSource)) {
  fail(`Cannot find TypeORM datasource at ${dataSource}`);
}

const result = spawnSync(
  'pnpm',
  [
    'exec',
    'typeorm-ts-node-commonjs',
    ...commands[action](),
    ...forwardedArgs(),
  ],
  {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: {
      ...process.env,
      TS_NODE_PROJECT: join(backendRoot, 'tsconfig.app.json'),
    },
  },
);

process.exit(result.status ?? 1);

function requiredName() {
  const inlineName = readOption('name');
  const positionalName = args.find((arg) => !arg.startsWith('-'));
  const name = inlineName || positionalName;

  if (!name) {
    fail(
      `Missing migration name. Example: pnpm db:migration:${action} -- --name=CreateUsers`,
    );
  }

  return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

function migrationPath(name) {
  return join(migrationsDir, name);
}

function readOption(name) {
  const prefix = `--${name}=`;
  const index = args.findIndex((arg) => arg === `--${name}`);

  if (index >= 0) return args[index + 1];

  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function forwardedArgs() {
  return args.filter((arg, index) => {
    if (arg.startsWith('--name=')) return false;
    if (arg === '--name') return false;
    if (index > 0 && args[index - 1] === '--name') return false;
    if (
      !arg.startsWith('-') &&
      (action === 'create' || action === 'generate')
    ) {
      return false;
    }
    return true;
  });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
