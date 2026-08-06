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

// jsdom ships no ResizeObserver. A real one reports the size as soon as it starts observing, and
// components that measure themselves stay inert until it does — so the stub has to do the same.
const STUB_OBSERVED_WIDTH = 320;

class ResizeObserverStub {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(target: Element) {
    this.callback(
      [{ target, contentRect: { width: STUB_OBSERVED_WIDTH } } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

Object.assign(globalThis, { ResizeObserver: ResizeObserverStub });

// input-otp probes this to place its password-manager badge; jsdom does not implement it.
Object.defineProperty(document, 'elementFromPoint', {
  value: () => null,
  writable: true,
});

Object.defineProperty(window, 'scrollTo', {
  value: () => undefined,
  writable: true,
});
