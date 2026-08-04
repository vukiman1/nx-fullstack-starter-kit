import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { DashboardSettingsPage } from './dashboard-settings-page';
import { authService } from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  authService: {
    getMe: jest.fn(),
    getSessions: jest.fn(),
    revokeSession: jest.fn(),
    revokeOtherSessions: jest.fn(),
    changePassword: jest.fn(),
    forgotPassword: jest.fn(),
    logout: jest.fn(),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const rootRoute = createRootRoute();
  const route = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: DashboardSettingsPage,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([route]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
}

describe('DashboardSettingsPage', () => {
  it('renders all three cards', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({
      user: { email: 'a@b.c', avatar: null, isEmailVerified: true, hasPassword: true },
    } as never);
    jest.mocked(authService.getSessions).mockResolvedValue({ sessions: [] } as never);

    renderPage();

    expect(await screen.findByText('Profile')).toBeTruthy();
    expect(await screen.findByText('Password')).toBeTruthy();
    expect(await screen.findByText('Login sessions')).toBeTruthy();
  });
});
