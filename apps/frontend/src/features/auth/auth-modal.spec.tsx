import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { z } from 'zod';
import { AuthModal } from './auth-modal';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/services/auth-service', () => ({
  authService: { login: jest.fn() },
}));
jest.mock('./google-sign-in-button', () => ({
  GoogleSignInButton: () => null,
}));

function renderAt(initialEntry: string) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute({
    validateSearch: z.object({
      auth: z.enum(['login', 'register']).optional(),
      redirect: z.string().optional(),
    }),
    component: () => (
      <>
        <AuthModal />
        <p>home page</p>
      </>
    ),
  });
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/' });
  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard/settings',
    component: () => <p>settings page</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
    history: createMemoryHistory({ initialEntries: [initialEntry] }),
  });

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );

  return router;
}

describe('AuthModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({ user: null, isInitializing: false });
  });

  it('stays closed when the search param is absent', async () => {
    renderAt('/');

    await screen.findByText('home page');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens straight from a link carrying auth=login', async () => {
    renderAt('/?auth=login');

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(await screen.findByRole('button', { name: /continue with email/i })).toBeTruthy();
  });

  it('reaches the password form through the email option', async () => {
    renderAt('/?auth=login');
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));

    expect(await screen.findByLabelText('Email')).toBeTruthy();
    expect(screen.getByLabelText('Password')).toBeTruthy();
  });

  it('goes back to the provider choice from the password form', async () => {
    renderAt('/?auth=login');
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await screen.findByLabelText('Email');

    fireEvent.click(screen.getByRole('button', { name: /back to the other options/i }));

    expect(await screen.findByRole('button', { name: /continue with email/i })).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('does not open for someone already signed in', async () => {
    useAuthStore.setState({ user: { email: 'a@b.c' }, isInitializing: false });

    renderAt('/?auth=login');

    await screen.findByText('home page');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('drops the param from the url when dismissed', async () => {
    const router = renderAt('/?auth=login');
    await screen.findByRole('dialog');

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(router.state.location.search).toEqual({}));
  });

  it('returns to the page a guard bounced the user away from', async () => {
    jest.mocked(authService.login).mockResolvedValue({ user: { email: 'a@b.c' } } as never);
    const router = renderAt('/?auth=login&redirect=%2Fdashboard%2Fsettings');
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await screen.findByLabelText('Email');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard/settings'));
  });

  it('stays on the current page when there is no redirect to honour', async () => {
    jest.mocked(authService.login).mockResolvedValue({ user: { email: 'a@b.c' } } as never);
    const router = renderAt('/?auth=login');
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: /continue with email/i }));
    await screen.findByLabelText('Email');

    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => expect(router.state.location.search).toEqual({}));
    expect(router.state.location.pathname).toBe('/');
  });
});
