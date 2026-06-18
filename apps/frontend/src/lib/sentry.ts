import * as Sentry from '@sentry/react';
import { appConfig } from '@/config/app-config';

export function initSentry(): void {
  if (!appConfig.sentry.dsn) {
    return;
  }

  Sentry.init({
    dsn: appConfig.sentry.dsn,
    environment: appConfig.app.environment,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    tracePropagationTargets: ['localhost', /^\/api/],
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: true,
  });
}
