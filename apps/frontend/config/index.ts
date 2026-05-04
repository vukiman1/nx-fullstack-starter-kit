import { existsSync } from 'node:fs';
import { join } from 'node:path';
import dotenv from 'dotenv';
import type { FrontendPublicConfig } from '../src/config/types';

interface NodeConfig {
  util: { toObject: () => Record<string, unknown> };
}

type RequireFn = (id: string) => unknown;

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

  return nodeConfig.util.toObject() as unknown as FrontendPublicConfig;
}
