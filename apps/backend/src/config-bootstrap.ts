import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import customEnvironmentVariablesYml from '../config/custom-environment-variables.yml';
import defaultYml from '../config/default.yml';
import productionYml from '../config/production.yml';

/**
 * Serverless bundles ship as a single file: the YAML config directory never reaches the function,
 * and node-config resolves its paths at runtime so no file tracer can pull them in either. The
 * contents are inlined at build time and written to the one writable path a function has.
 *
 * Must be imported before anything that reads configuration.
 */
const CONFIG_DIR = '/tmp/backend-config';

const FILES: ReadonlyArray<readonly [string, string]> = [
  ['default.yml', defaultYml],
  ['production.yml', productionYml],
  ['custom-environment-variables.yml', customEnvironmentVariablesYml],
];

mkdirSync(CONFIG_DIR, { recursive: true });
for (const [name, contents] of FILES) {
  writeFileSync(join(CONFIG_DIR, name), contents);
}

process.env.NODE_CONFIG_DIR = CONFIG_DIR;
