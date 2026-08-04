import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityCard } from './security-card';
import { authService } from '@/services/auth-service';

jest.mock('@/services/auth-service', () => ({
  authService: { getMe: jest.fn(), changePassword: jest.fn(), forgotPassword: jest.fn() },
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityCard />
    </QueryClientProvider>,
  );
}

describe('SecurityCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the change form for an account that has a password', async () => {
    jest
      .mocked(authService.getMe)
      .mockResolvedValue({ user: { email: 'a@b.c', hasPassword: true } } as never);

    renderCard();

    expect(await screen.findByLabelText('Current password')).toBeTruthy();
  });

  it('offers an email link instead when the account has no password', async () => {
    jest
      .mocked(authService.getMe)
      .mockResolvedValue({ user: { email: 'g@b.c', hasPassword: false } } as never);

    renderCard();

    expect(
      await screen.findByRole('button', { name: 'Email me a link to set a password' }),
    ).toBeTruthy();
    expect(screen.queryByLabelText('Current password')).toBeNull();
  });

  it('sends the set-password email to the account address', async () => {
    jest
      .mocked(authService.getMe)
      .mockResolvedValue({ user: { email: 'g@b.c', hasPassword: false } } as never);
    jest.mocked(authService.forgotPassword).mockResolvedValue({ message: 'ok' } as never);

    renderCard();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Email me a link to set a password' }),
    );

    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith('g@b.c'));
    expect(await screen.findByText('Check your inbox for the link.')).toBeTruthy();
  });

  it('shows the server message when the current password is wrong', async () => {
    jest
      .mocked(authService.getMe)
      .mockResolvedValue({ user: { email: 'a@b.c', hasPassword: true } } as never);
    jest
      .mocked(authService.changePassword)
      .mockRejectedValue(new Error('Current password is incorrect'));

    renderCard();
    fireEvent.change(await screen.findByLabelText('Current password'), {
      target: { value: 'wrong' },
    });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ngPass!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Str0ngPass!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
  });

  it('clears the form and reports success after a change', async () => {
    jest
      .mocked(authService.getMe)
      .mockResolvedValue({ user: { email: 'a@b.c', hasPassword: true } } as never);
    jest.mocked(authService.changePassword).mockResolvedValue({ message: 'ok' } as never);

    renderCard();
    const current = (await screen.findByLabelText('Current password')) as HTMLInputElement;
    fireEvent.change(current, { target: { value: 'old-one' } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ngPass!' } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), {
      target: { value: 'Str0ngPass!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(
      await screen.findByText('Password updated. Other devices were signed out.'),
    ).toBeTruthy();
    expect(current.value).toBe('');
  });
});
