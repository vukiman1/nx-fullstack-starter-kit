import { existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';

const runtimeFile = join(process.cwd(), 'tmp', 'backend-e2e-runtime.json');

interface RuntimeState {
  env?: Record<string, string>;
  pid?: number;
  teardownMessage?: string;
}

module.exports = async function () {
  const runtime = readRuntime();

  if (runtime.pid) {
    try {
      process.kill(-runtime.pid, 'SIGTERM');
    } catch {
      try {
        process.kill(runtime.pid, 'SIGTERM');
      } catch {
        // The backend process may have already exited after tests finish.
      }
    }
  }

  if (process.env.KEEP_E2E_INFRA !== 'true') {
    spawnSync('docker', ['compose', 'down'], {
      cwd: process.cwd(),
      env: { ...process.env, ...runtime.env },
      stdio: 'inherit',
    });
  }

  rmSync(runtimeFile, { force: true });
  console.log(runtime.teardownMessage ?? '\nTearing down...\n');
};

function readRuntime(): RuntimeState {
  if (!existsSync(runtimeFile)) return {};

  return JSON.parse(readFileSync(runtimeFile, 'utf8')) as RuntimeState;
}
