import { redirect, type ParsedLocation } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store';
import { bootstrapAuth } from './use-auth-bootstrap';

interface BeforeLoadContext {
  location: ParsedLocation;
}

/**
 * Block route until session is restored, then redirect anonymous users to /login
 * with a `redirect` search param so they can be sent back after authenticating.
 */
export async function requireAuth({ location }: BeforeLoadContext) {
  await bootstrapAuth();
  if (!useAuthStore.getState().user) {
    throw redirect({
      to: '/login',
      search: { redirect: location.href },
    });
  }
}

/**
 * Block route until session is restored, then bounce signed-in users away.
 * Honours an existing `redirect` search param if present, otherwise falls back to /.
 */
export async function requireAnonymous({ location }: BeforeLoadContext) {
  await bootstrapAuth();
  if (useAuthStore.getState().user) {
    const search = location.search as { redirect?: unknown };
    const target = isInternalPath(search.redirect) ? search.redirect : '/';
    throw redirect({ to: target });
  }
}

export function isInternalPath(value: unknown): value is string {
  return typeof value === 'string' && /^\/(?!\/)/.test(value);
}
