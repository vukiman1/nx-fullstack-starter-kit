import type { ApiErrorEnvelope, ApiErrorPayload } from '@org/shared-contracts';

function extractMessage(errors: ApiErrorPayload): string {
  if (errors && typeof errors === 'object' && 'message' in errors) {
    const message = (errors as { message: unknown }).message;
    if (typeof message === 'string') return message;
  }
  const firstValue = Object.values(errors ?? {}).find((value) => typeof value === 'string');
  return typeof firstValue === 'string' ? firstValue : 'Request failed';
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors: ApiErrorPayload;

  constructor(envelope: ApiErrorEnvelope) {
    super(extractMessage(envelope.errors));
    this.name = 'ApiError';
    this.statusCode = envelope.statusCode;
    this.errors = envelope.errors;
  }
}

export function isApiErrorEnvelope(value: unknown): value is ApiErrorEnvelope {
  return (
    !!value &&
    typeof value === 'object' &&
    'success' in value &&
    (value as { success: unknown }).success === false &&
    'statusCode' in value &&
    'errors' in value
  );
}

/**
 * The message to show a person for a failed request. Only an ApiError carries wording the backend
 * meant for them; anything else is a crash or a network fault, whose message would be noise.
 */
export function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof ApiError ? caught.message : fallback;
}
