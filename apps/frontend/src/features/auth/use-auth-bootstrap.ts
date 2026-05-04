import { useEffect } from 'react';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

let bootstrapPromise: Promise<void> | null = null;

export function bootstrapAuth(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;

  bootstrapPromise = (async () => {
    const { setUser, setInitializing } = useAuthStore.getState();
    try {
      const result = await authService.getMe();
      setUser(result.user);
    } catch {
      // No valid session — stay anonymous
    } finally {
      setInitializing(false);
    }
  })();

  return bootstrapPromise;
}

export function useAuthBootstrap() {
  useEffect(() => {
    void bootstrapAuth();
  }, []);
}
