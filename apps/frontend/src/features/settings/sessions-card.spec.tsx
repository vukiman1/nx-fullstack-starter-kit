import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { SessionsCard } from './sessions-card';
import { authService } from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  authService: { getSessions: jest.fn(), revokeSession: jest.fn(), revokeOtherSessions: jest.fn() },
}));

const BASE_SESSION = {
  id: 's1',
  ipAddress: '203.0.113.5',
  country: 'VN',
  city: 'Hanoi',
  userAgent: 'Mozilla/5.0',
  browserName: 'Chrome',
  osName: 'Windows',
  deviceType: 'Desktop',
  rememberMe: false,
  authProvider: 'local',
  lastSeenAt: '2026-08-01T00:00:00.000Z',
  expiresAt: '2026-09-01T00:00:00.000Z',
  createdAt: '2026-08-01T00:00:00.000Z',
  isCurrent: false,
};

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfirmProvider>
        <SessionsCard />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
}

describe('SessionsCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the city and country of a session', async () => {
    jest.mocked(authService.getSessions).mockResolvedValue({ sessions: [BASE_SESSION] } as never);

    renderCard();

    expect(await screen.findByText('Hanoi, VN')).toBeTruthy();
  });

  it('shows Unknown when the edge sent no location', async () => {
    jest.mocked(authService.getSessions).mockResolvedValue({
      sessions: [{ ...BASE_SESSION, country: null, city: null }],
    } as never);

    renderCard();

    expect(await screen.findByText('Unknown')).toBeTruthy();
  });

  it('cannot revoke the current session', async () => {
    jest.mocked(authService.getSessions).mockResolvedValue({
      sessions: [{ ...BASE_SESSION, isCurrent: true }],
    } as never);

    renderCard();

    const button = await screen.findByRole('button', { name: 'Revoke session' });
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('asks for confirmation before signing out other devices', async () => {
    jest.mocked(authService.getSessions).mockResolvedValue({ sessions: [BASE_SESSION] } as never);
    jest.mocked(authService.revokeOtherSessions).mockResolvedValue({ message: 'ok' } as never);

    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out other devices' }));

    expect(authService.revokeOtherSessions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Yes, sign them out' }));

    await waitFor(() => expect(authService.revokeOtherSessions).toHaveBeenCalled());
  });

  it('hides the sign-out-others action when this is the only session', async () => {
    jest.mocked(authService.getSessions).mockResolvedValue({
      sessions: [{ ...BASE_SESSION, isCurrent: true }],
    } as never);

    renderCard();

    await screen.findByText('Hanoi, VN');
    expect(screen.queryByRole('button', { name: 'Sign out other devices' })).toBeNull();
  });
});
