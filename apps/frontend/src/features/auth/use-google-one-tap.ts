import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { appConfig } from '@/config/app-config';
import { ensureGoogleIdentity, promptGoogleOneTap } from '@/lib/google-identity';
import { authService } from '@/services/auth-service';
import { selectIsAuthenticated, selectIsInitializing, useAuthStore } from '@/stores/auth-store';
import { startSession } from './session';

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

    // Both paths below are invoked by Google, not by us, so a rejection here has nobody to catch
    // it. One Tap is an optional shortcut — a blocked script or a refused credential must leave
    // the rest of the page working, with the normal login form still available.
    const onCredential = async (credential: string) => {
      try {
        const result = await authService.googleOneTap(credential);
        startSession(result.user);
        await navigate({ to: '/' });
      } catch (error) {
        console.error('Google One Tap sign-in failed', error);
      }
    };

    void ensureGoogleIdentity({ clientId, callback: onCredential })
      .then(() => {
        if (!cancelled) {
          promptGoogleOneTap();
        }
      })
      .catch((error) => {
        console.warn('Google One Tap unavailable', error);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId, isAuthenticated, isInitializing, navigate]);
}
