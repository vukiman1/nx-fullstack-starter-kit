import { TextDecoder, TextEncoder } from 'node:util';
import { loadFrontendConfig } from '../config/index';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  __FRONTEND_CONFIG__: loadFrontendConfig('test'),
});

Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});
