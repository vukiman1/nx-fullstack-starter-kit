import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity, promptGoogleOneTap } from '@/lib/google-identity';
import { authService } from '@/services/auth-service';
import { selectIsAuthenticated, selectIsInitializing, useAuthStore } from '@/stores/auth-store';

export function useGoogleOneTap(): void {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isInitializing = useAuthStore(selectIsInitializing);
  const clientId = appConfig.google.clientId;

  useEffect(() => {
    if (!clientId || isInitializing || isAuthenticated) {
      return;
    }
    let cancelled = false;

    const onCredential = async (credential: string) => {
      const result = await authService.googleOneTap(credential);
      useAuthStore.getState().setUser(result.user);
      await navigate({ to: '/' });
    };

    void ensureGoogleIdentity({ clientId, callback: onCredential }).then(() => {
      if (!cancelled) {
        promptGoogleOneTap();
      }
    });

    return () => {
      cancelled = true;
    };
  }, [clientId, isAuthenticated, isInitializing, navigate]);
}
