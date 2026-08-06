import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TwoFactorCard } from './two-factor-card';
import { authService } from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  authService: {
    getMe: jest.fn(),
    getTwoFactorStatus: jest.fn(),
    startTwoFactorSetup: jest.fn(),
    confirmTwoFactorSetup: jest.fn(),
    disableTwoFactor: jest.fn(),
    regenerateRecoveryCodes: jest.fn(),
  },
}));
jest.mock('@/lib/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('qrcode', () => ({ toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,x') }));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <TwoFactorCard />
    </QueryClientProvider>,
  );
}

describe('TwoFactorCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authService.getMe).mockResolvedValue({ user: { hasPassword: true } } as never);
  });

  it('will not let a passwordless account switch it on, since it could never switch it off', async () => {
    jest.mocked(authService.getMe).mockResolvedValue({ user: { hasPassword: false } } as never);
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: false, unusedRecoveryCodes: 0 });

    renderCard();

    const button = (await screen.findByRole('button', {
      name: 'Set up two-factor authentication',
    })) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(screen.getByText(/Set a password first/)).toBeTruthy();
  });

  it('offers to set it up when it is off', async () => {
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: false, unusedRecoveryCodes: 0 });

    renderCard();

    expect(
      await screen.findByRole('button', { name: 'Set up two-factor authentication' }),
    ).toBeTruthy();
  });

  it('says so when the status cannot be loaded, instead of spinning forever', async () => {
    jest.mocked(authService.getTwoFactorStatus).mockRejectedValue(new Error('offline'));

    renderCard();

    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByText('Loading...')).toBeNull();
  });

  it('warns when recovery codes are nearly exhausted', async () => {
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: true, unusedRecoveryCodes: 1 });

    renderCard();

    expect(await screen.findByText(/Generate a new set before you run out/)).toBeTruthy();
  });

  it('will not turn off without asking for the password first', async () => {
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: true, unusedRecoveryCodes: 8 });

    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }));

    expect(await screen.findByLabelText('Current password')).toBeTruthy();
    expect(authService.disableTwoFactor).not.toHaveBeenCalled();
  });

  it('sends the password when the user confirms', async () => {
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: true, unusedRecoveryCodes: 8 });
    jest.mocked(authService.disableTwoFactor).mockResolvedValue({ message: 'ok' });

    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }));
    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'hunter2' },
    });
    // Radix marks the page behind the dialog aria-hidden, so this resolves to the dialog's button
    // rather than the card's.
    fireEvent.click(screen.getByRole('button', { name: 'Turn off' }));

    await waitFor(() => expect(authService.disableTwoFactor).toHaveBeenCalledWith('hunter2'));
  });

  it('shows the recovery codes after generating a new set', async () => {
    jest
      .mocked(authService.getTwoFactorStatus)
      .mockResolvedValue({ enabled: true, unusedRecoveryCodes: 2 });
    jest
      .mocked(authService.regenerateRecoveryCodes)
      .mockResolvedValue({ recoveryCodes: ['aaaa111122', 'bbbb333344'] });

    renderCard();
    fireEvent.click(await screen.findByRole('button', { name: 'Generate new recovery codes' }));

    expect(await screen.findByText('aaaa111122')).toBeTruthy();
    expect(await screen.findByText(/only time they are shown/i)).toBeTruthy();
  });
});
