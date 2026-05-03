import { TextDecoder, TextEncoder } from 'node:util';

Object.assign(globalThis, {
  TextDecoder,
  TextEncoder,
});

Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});
