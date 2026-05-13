import { existsSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import type { FrontendPublicConfig } from '../src/config/types';

interface NodeConfig {
  util: { toObject: () => Record<string, unknown> };
}

type RequireFn = (id: string) => unknown;

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
});

function resolveFrontendRoot() {
  const candidates = [
    process.cwd(),
    join(process.cwd(), 'apps/frontend'),
    join(__dirname, '..'),
  ];
  return (
    candidates.find((candidate) =>
      existsSync(join(candidate, 'config/default.yml')),
    ) || join(process.cwd(), 'apps/frontend')
  );
}

export function loadFrontendConfig(
  mode = process.env.NODE_ENV || 'development',
  requireFn: RequireFn = require,
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
      join(frontendRoot, '.env.example'),
      '.env.example',
    ],
  });

  const nodeConfig = requireFn('config') as NodeConfig;

  return frontendPublicConfigSchema.parse(
    nodeConfig.util.toObject(),
  ) as FrontendPublicConfig;
}
