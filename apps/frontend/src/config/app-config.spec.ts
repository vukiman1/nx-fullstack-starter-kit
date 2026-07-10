import { loadFrontendConfig } from '../../config/index';
import { appConfig } from './app-config';

function createRequireStub(readConfigFile: () => Record<string, unknown>) {
  const resolvedPath = '/stub/node_modules/config/lib/config.js';
  const cache: NodeJS.Require['cache'] = {};

  const requireStub = (id: string): unknown => {
    if (id !== 'config') {
      throw new Error(`Unexpected require: ${id}`);
    }
    if (!cache[resolvedPath]) {
      const snapshot = readConfigFile();
      cache[resolvedPath] = { exports: { util: { toObject: () => snapshot } } } as NodeModule;
    }
    return cache[resolvedPath]?.exports;
  };

  return Object.assign(requireStub, {
    resolve: (id: string): string => (id === 'config' ? resolvedPath : id),
    cache,
  });
}

describe('frontend config', () => {
  it('loads values from test.yml when mode=test', () => {
    const config = loadFrontendConfig('test');

    expect(config).toEqual({
      app: { name: 'My Workspace', environment: 'test' },
      api: { baseUrl: 'http://localhost:3000/api' },
      sentry: { dsn: '' },
      google: { clientId: '' },
    });
  });

  it('picks up config file changes when reloaded within the same process', () => {
    let appName = 'Before';
    const requireStub = createRequireStub(() => ({
      app: { name: appName, environment: 'test' },
      api: { baseUrl: 'http://localhost:3000/api' },
      sentry: { dsn: '' },
      google: { clientId: '' },
    }));

    const first = loadFrontendConfig('test', requireStub);
    appName = 'After';
    const second = loadFrontendConfig('test', requireStub);

    expect(first.app.name).toBe('Before');
    expect(second.app.name).toBe('After');
  });

  it('exposes the loaded config via appConfig at runtime', () => {
    expect(appConfig.app.environment).toBe('test');
    expect(appConfig.app.name).toBe('My Workspace');
    expect(appConfig.api.baseUrl).toBe('http://localhost:3000/api');
    expect(appConfig.google.clientId).toBe('');
  });
});
