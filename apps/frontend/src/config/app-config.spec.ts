import { loadFrontendConfig } from '../../config/index';
import { appConfig } from './app-config';

describe('frontend config', () => {
  it('loads values from test.yml when mode=test', () => {
    const config = loadFrontendConfig('test');

    expect(config).toEqual({
      app: { name: 'My Workspace', environment: 'test' },
      api: { baseUrl: 'http://localhost:3000/api' },
    });
  });

  it('exposes the loaded config via appConfig at runtime', () => {
    expect(appConfig.app.environment).toBe('test');
    expect(appConfig.app.name).toBe('My Workspace');
    expect(appConfig.api.baseUrl).toBe('http://localhost:3000/api');
  });
});
