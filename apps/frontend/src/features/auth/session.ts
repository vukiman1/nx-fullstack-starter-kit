import type { User } from '@org/shared-contracts';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Every cached query belongs to whoever was signed in when it was fetched, so switching identity
 * has to throw the cache away. Without this, signing in as someone else serves the previous
 * account's data until the entries go stale — the settings page shows the wrong user outright.
 */
export function startSession(user: User): void {
  queryClient.clear();
  useAuthStore.getState().setUser(user);
}

export function endSession(): void {
  queryClient.clear();
  useAuthStore.getState().clearUser();
}
