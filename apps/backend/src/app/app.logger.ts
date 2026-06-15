import { inspect } from 'node:util';
import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import configuration from '@org/backend-config';

const NEST_LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

function toLogLevels(values: readonly string[]): LogLevel[] {
  return values.filter((value): value is LogLevel =>
    (NEST_LOG_LEVELS as readonly string[]).includes(value),
  );
}

function toMessage(message: unknown): string {
  return typeof message === 'string' ? message : inspect(message);
}

class SentryForwardingLogger extends ConsoleLogger {
  warn(message: unknown, ...optionalParams: unknown[]): void {
    super.warn(message, ...optionalParams);
    Sentry.logger.warn(toMessage(message));
  }

  error(message: unknown, ...optionalParams: unknown[]): void {
    super.error(message, ...optionalParams);
    Sentry.logger.error(toMessage(message));
  }
}

export function createAppLogger(): ConsoleLogger {
  const { app, sentry } = configuration();
  const options = {
    json: app.nodeEnv === 'production',
    logLevels: toLogLevels(app.logLevels),
  };

  return sentry.dsn ? new SentryForwardingLogger(options) : new ConsoleLogger(options);
}
