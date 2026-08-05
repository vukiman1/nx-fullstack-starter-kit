import { TextDecoder, TextEncoder } from 'node:util';
import { configure } from '@testing-library/dom';
import { loadFrontendConfig } from '../config/index';

// The 1s default is not enough for a card that waits on a router mount plus a query to settle:
// under load these specs fail on the clock rather than on behaviour. A real hang still fails,
// just later.
configure({ asyncUtilTimeout: 5_000 });

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
  __FRONTEND_CONFIG__: loadFrontendConfig('test'),
});

Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});
