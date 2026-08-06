import { useEffect, useRef, useState } from 'react';
import { ApiError } from '@/lib/api-error';

export type TokenOutcome =
  | { status: 'working' }
  | { status: 'done'; message: string }
  | { status: 'failed'; message: string };

/**
 * Spends a token from an email link exactly once. Without the guard, StrictMode's second render
 * would report failure for a link the user had just used successfully.
 */
export function useOneTimeToken(
  token: string | undefined,
  spend: (token: string) => Promise<{ message: string }>,
  fallbackError: string,
): TokenOutcome {
  const [result, setResult] = useState<TokenOutcome | null>(null);
  const hasRun = useRef(false);

  useEffect(() => {
    if (!token || hasRun.current) {
      return;
    }
    hasRun.current = true;

    spend(token)
      .then(({ message }) => setResult({ status: 'done', message }))
      .catch((caught: unknown) =>
        setResult({
          status: 'failed',
          message: caught instanceof ApiError ? caught.message : fallbackError,
        }),
      );
  }, [token, spend, fallbackError]);

  if (!token) {
    return { status: 'failed', message: 'This link is missing its token.' };
  }
  return result ?? { status: 'working' };
}
