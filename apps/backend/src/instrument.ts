import * as Sentry from '@sentry/nestjs';
import configuration from '@org/backend-config';

type ProfilingIntegration = ReturnType<
  (typeof import('@sentry/profiling-node'))['nodeProfilingIntegration']
>;

const { sentry, app } = configuration();

function loadProfilingIntegrations(): ProfilingIntegration[] {
  try {
    // static import would eagerly load a native addon with no prebuilt for every Node ABI (e.g. Node 25); a guarded require keeps a missing binary from crashing boot
    const { nodeProfilingIntegration } =
      require('@sentry/profiling-node') as typeof import('@sentry/profiling-node');
    return [nodeProfilingIntegration()];
  } catch (error) {
    console.warn(
      'Sentry CPU profiling disabled: native addon unavailable for this Node runtime.',
      error,
    );
    return [];
  }
}

if (sentry.dsn) {
  Sentry.init({
    dsn: sentry.dsn,
    environment: app.nodeEnv,
    integrations: loadProfilingIntegrations(),
    tracesSampleRate: sentry.tracesSampleRate,
    profileLifecycle: 'trace',
    profileSessionSampleRate: 1.0,
    enableLogs: true,
  });
}
