import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { UserMenu } from './user-menu';
import { authService } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';

jest.mock('@/services/auth-service', () => ({
  authService: { logout: jest.fn() },
}));

function renderMenu() {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => <UserMenu />,
  });
  const settingsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/dashboard/settings',
    component: () => <p>settings page</p>,
  });
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, settingsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });

  return render(<RouterProvider router={router} />);
}

describe('UserMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      user: { email: 'jane@example.com', avatar: null },
      isInitializing: false,
    });
  });

  it('shows the email on the trigger', async () => {
    renderMenu();

    expect(await screen.findByText('jane@example.com')).toBeTruthy();
  });

  it('keeps the menu closed until the trigger is clicked', async () => {
    renderMenu();

    await screen.findByText('jane@example.com');
    expect(screen.queryByRole('menuitem', { name: 'Settings' })).toBeNull();
  });

  it('opens the menu with settings and logout', async () => {
    renderMenu();

    fireEvent.keyDown(await screen.findByRole('button', { name: /jane@example.com/ }), {
      key: 'Enter',
    });

    expect(await screen.findByRole('menuitem', { name: 'Settings' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Logout' })).toBeTruthy();
  });

  it('logs out and clears the stored user', async () => {
    jest.mocked(authService.logout).mockResolvedValue({ message: 'ok' } as never);
    renderMenu();

    fireEvent.keyDown(await screen.findByRole('button', { name: /jane@example.com/ }), {
      key: 'Enter',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Logout' }));

    await waitFor(() => expect(authService.logout).toHaveBeenCalled());
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
  });

  it('clears the user even when the logout request fails', async () => {
    jest.mocked(authService.logout).mockRejectedValue(new Error('network down'));
    renderMenu();

    fireEvent.keyDown(await screen.findByRole('button', { name: /jane@example.com/ }), {
      key: 'Enter',
    });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Logout' }));

    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
  });

  it('returns focus to the trigger when the menu is closed with Escape', async () => {
    renderMenu();
    const trigger = await screen.findByRole('button', { name: /jane@example.com/ });
    fireEvent.keyDown(trigger, { key: 'Enter' });
    await screen.findByRole('menuitem', { name: 'Settings' });

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });

    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('shows the avatar image when the account has one', async () => {
    useAuthStore.setState({
      user: { email: 'jane@example.com', avatar: 'https://pic/a.png' },
      isInitializing: false,
    });

    renderMenu();

    expect(await screen.findByAltText('jane@example.com')).toBeTruthy();
  });
});
