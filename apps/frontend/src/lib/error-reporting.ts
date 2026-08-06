import { appConfig } from '@/config/app-config';

type SentryModule = typeof import('@sentry/react');

let sentryModule: Promise<SentryModule> | null = null;

/**
 * Sentry is a quarter of the bundle and inert without a DSN, so it is loaded dynamically. The cost
 * is that failures before the chunk arrives go unreported.
 */
function loadSentry(): Promise<SentryModule> {
  sentryModule ??= import('@sentry/react');
  return sentryModule;
}

export function isErrorReportingEnabled(): boolean {
  return Boolean(appConfig.sentry.dsn);
}

export async function initErrorReporting(): Promise<void> {
  if (!isErrorReportingEnabled()) {
    return;
  }

  const Sentry = await loadSentry();
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

export function reportError(error: unknown): void {
  if (!isErrorReportingEnabled()) {
    return;
  }

  void loadSentry().then((Sentry) => Sentry.captureException(error));
}
