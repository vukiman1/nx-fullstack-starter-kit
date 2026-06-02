import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import configuration from '@org/backend-config';

const NEST_LOG_LEVELS: readonly LogLevel[] = ['error', 'warn', 'log', 'debug', 'verbose'];

function toLogLevels(values: readonly string[]): LogLevel[] {
  return values.filter((value): value is LogLevel =>
    (NEST_LOG_LEVELS as readonly string[]).includes(value),
  );
}

export function createAppLogger(): ConsoleLogger {
  const { app } = configuration();

  return new ConsoleLogger({
    json: app.nodeEnv === 'production',
    logLevels: toLogLevels(app.logLevels),
  });
}
