import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-error';

const DEFAULT_STALE_TIME_MS = 60_000;
const MAX_RETRIES = 2;

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.statusCode < 500) {
    return false;
  }
  return failureCount < MAX_RETRIES;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      refetchOnWindowFocus: false,
      retry: shouldRetry,
    },
  },
});
