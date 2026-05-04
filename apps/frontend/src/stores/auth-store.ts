import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { appConfig } from '@/config/app-config';
import type { User } from '@/services/interfaces/service.interfaces';

interface AuthState {
  user: User | null;
  isInitializing: boolean;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  clearUser: () => void;
  setInitializing: (value: boolean) => void;
  reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  isInitializing: true,
};

export const useAuthStore = create<AuthStore>()(
  devtools(
    (set) => ({
      ...initialState,
      setUser: (user) => set({ user }, false, 'auth/setUser'),
      clearUser: () => set({ user: null }, false, 'auth/clearUser'),
      setInitializing: (isInitializing) =>
        set({ isInitializing }, false, 'auth/setInitializing'),
      reset: () => set(initialState, false, 'auth/reset'),
    }),
    {
      name: 'auth',
      enabled: appConfig.app.environment !== 'production',
    },
  ),
);

// Selectors — use with `useAuthStore(selectUser)` so the component
// only re-renders when that slice changes.
export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.user !== null;
export const selectIsInitializing = (state: AuthStore) => state.isInitializing;
export const selectAuthActions = (state: AuthStore) => ({
  setUser: state.setUser,
  clearUser: state.clearUser,
  setInitializing: state.setInitializing,
  reset: state.reset,
});
