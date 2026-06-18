import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import configuration from '@org/backend-config';

const { sentry, app } = configuration();

if (sentry.dsn) {
  Sentry.init({
    dsn: sentry.dsn,
    environment: app.nodeEnv,
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: sentry.tracesSampleRate,
    profileLifecycle: 'trace',
    profileSessionSampleRate: 1.0,
    enableLogs: true,
  });
}
