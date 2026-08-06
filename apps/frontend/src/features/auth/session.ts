import type { User } from '@org/shared-contracts';
import { queryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';

/**
 * Cached queries belong to whoever was signed in when they were fetched, so switching identity has
 * to discard the cache — otherwise the next account is served the previous one's data.
 */
export function startSession(user: User): void {
  queryClient.clear();
  useAuthStore.getState().setUser(user);
}

export function endSession(): void {
  queryClient.clear();
  useAuthStore.getState().clearUser();
}
