import { renderHook, waitFor } from '@testing-library/react';
import { useGoogleOneTap } from './use-google-one-tap';
import { ensureGoogleIdentity, promptGoogleOneTap } from '@/lib/google-identity';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/config/app-config', () => ({
  appConfig: {
    app: { name: 'Test', environment: 'test' },
    api: { baseUrl: 'http://localhost:3000/api' },
    sentry: { dsn: '' },
    google: { clientId: 'test-client-id' },
  },
}));
jest.mock('@/lib/google-identity', () => ({
  ensureGoogleIdentity: jest.fn().mockResolvedValue(undefined),
  promptGoogleOneTap: jest.fn(),
}));
jest.mock('@/services/auth-service', () => ({
  authService: { googleOneTap: jest.fn() },
}));
const mockNavigate = jest.fn();
jest.mock('@tanstack/react-router', () => ({ useNavigate: () => mockNavigate }));

describe('useGoogleOneTap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, isInitializing: false });
  });

  it('prompts when the user is anonymous and initialization has finished', async () => {
    renderHook(() => useGoogleOneTap());

    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    await waitFor(() => expect(promptGoogleOneTap).toHaveBeenCalled());
  });

  it('does not prompt when the user is already authenticated', async () => {
    useAuthStore.setState({ user: { email: 'a@b.c' }, isInitializing: false });

    renderHook(() => useGoogleOneTap());

    await Promise.resolve();
    expect(ensureGoogleIdentity).not.toHaveBeenCalled();
    expect(promptGoogleOneTap).not.toHaveBeenCalled();
  });

  it('does not prompt while auth is still initializing', async () => {
    useAuthStore.setState({ user: null, isInitializing: true });

    renderHook(() => useGoogleOneTap());

    await Promise.resolve();
    expect(ensureGoogleIdentity).not.toHaveBeenCalled();
  });

  it('logs in and navigates home when a credential arrives', async () => {
    jest
      .mocked(authService.googleOneTap)
      .mockResolvedValue({ user: { email: 'jane@example.com' } } as never);
    renderHook(() => useGoogleOneTap());
    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    const onCredential = jest.mocked(ensureGoogleIdentity).mock.calls[0][0].callback;

    await onCredential('cred-1');

    expect(authService.googleOneTap).toHaveBeenCalledWith('cred-1');
    expect(useAuthStore.getState().user).toEqual({ email: 'jane@example.com' });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith({ to: '/' }));
  });
});
