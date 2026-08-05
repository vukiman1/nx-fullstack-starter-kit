import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import type { FrontendPublicConfig } from '../src/config/types.js';

interface NodeConfig {
  util: { toObject: () => Record<string, unknown> };
}

interface RequireFn {
  (id: string): unknown;
  resolve(id: string): string;
  cache: NodeJS.Require['cache'];
}

const frontendPublicConfigSchema = z.object({
  app: z.object({
    name: z.string().min(1),
    environment: z.enum(['development', 'test', 'production']),
  }),
  api: z.object({
    baseUrl: z
      .string()
      .refine(
        (value) => value.startsWith('/') || URL.canParse(value),
        'api.baseUrl must be an absolute URL or same-origin path',
      ),
  }),
  sentry: z.object({
    dsn: z.string().default(''),
  }),
  google: z.object({
    clientId: z.string().default(''),
  }),
});

const requireFromCwd = createRequire(join(process.cwd(), 'noop.js'));

function resolveFrontendRoot() {
  const candidates = [process.cwd(), join(process.cwd(), 'apps/frontend')];
  return (
    candidates.find((candidate) => existsSync(join(candidate, 'config/default.yml'))) ||
    join(process.cwd(), 'apps/frontend')
  );
}

export function loadFrontendConfig(
  mode = process.env.NODE_ENV || 'development',
  requireFn: RequireFn = requireFromCwd,
): FrontendPublicConfig {
  const nodeEnv = mode || 'development';
  const frontendRoot = resolveFrontendRoot();
  const configDir = join(frontendRoot, 'config');

  process.env.NODE_ENV = nodeEnv;
  process.env.NODE_CONFIG_DIR = configDir;

  dotenv.config({
    path: [
      join(frontendRoot, `.env.${nodeEnv}`),
      join(frontendRoot, '.env.local'),
      join(frontendRoot, '.env'),
      `.env.${nodeEnv}`,
      '.env.local',
      '.env',
    ],
  });

  delete requireFn.cache[requireFn.resolve('config')];
  const nodeConfig = requireFn('config') as NodeConfig;

  return frontendPublicConfigSchema.parse(nodeConfig.util.toObject()) as FrontendPublicConfig;
}
