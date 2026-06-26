export class InvalidDurationError extends Error {
  constructor(value: string) {
    super(`Invalid duration "${value}". Expected <number><s|m|h|d>, e.g. 15m, 7d.`);
    this.name = 'InvalidDurationError';
  }
}

const DURATION_PATTERN = /^(\d+)(s|m|h|d)$/;

const UNIT_TO_MS: Record<string, number> = {
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function parseDurationToMs(value: string): number {
  const match = DURATION_PATTERN.exec(value.trim());
  if (!match) {
    throw new InvalidDurationError(value);
  }
  const [, amount, unit] = match;
  return Number(amount) * UNIT_TO_MS[unit];
}
