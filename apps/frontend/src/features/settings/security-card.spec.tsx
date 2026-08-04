import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SecurityCard } from './security-card';
import { authService } from '@/services/auth-service';
import { notify } from '@/lib/toast';

jest.mock('@/services/auth-service', () => ({
  authService: { getMe: jest.fn(), changePassword: jest.fn(), forgotPassword: jest.fn() },
}));
jest.mock('@/lib/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

function renderCard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityCard />
    </QueryClientProvider>,
  );
}

function mockAccount(hasPassword: boolean, email = 'a@b.c') {
  jest.mocked(authService.getMe).mockResolvedValue({ user: { email, hasPassword } } as never);
}

async function openChangeForm() {
  fireEvent.click(await screen.findByRole('button', { name: 'Change password' }));
  return screen.findByLabelText('Current password');
}

async function fillAndSubmit() {
  fireEvent.change(await openChangeForm(), { target: { value: 'old-one' } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: 'Str0ngPass!' } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'Str0ngPass!' },
  });
  // Radix marks the page behind the dialog aria-hidden, so this resolves to the submit button.
  fireEvent.click(screen.getByRole('button', { name: 'Change password' }));
}

describe('SecurityCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('keeps the change form behind a button for an account that has a password', async () => {
    mockAccount(true);

    renderCard();

    expect(await screen.findByRole('button', { name: 'Change password' })).toBeTruthy();
    expect(screen.queryByLabelText('Current password')).toBeNull();
  });

  it('opens the form in a dialog', async () => {
    mockAccount(true);

    renderCard();

    expect(await openChangeForm()).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('offers an email link instead when the account has no password', async () => {
    mockAccount(false, 'g@b.c');

    renderCard();

    expect(
      await screen.findByRole('button', { name: 'Email me a link to set a password' }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Change password' })).toBeNull();
  });

  it('sends the set-password email to the account address', async () => {
    mockAccount(false, 'g@b.c');
    jest.mocked(authService.forgotPassword).mockResolvedValue({ message: 'ok' } as never);

    renderCard();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Email me a link to set a password' }),
    );

    await waitFor(() => expect(authService.forgotPassword).toHaveBeenCalledWith('g@b.c'));
    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith('Check your inbox for the link.'),
    );
  });

  it('shows the server message in the dialog when the current password is wrong', async () => {
    mockAccount(true);
    jest
      .mocked(authService.changePassword)
      .mockRejectedValue(new Error('Current password is incorrect'));

    renderCard();
    await fillAndSubmit();

    expect(await screen.findByText('Current password is incorrect')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes the dialog and reports success after a change', async () => {
    mockAccount(true);
    jest.mocked(authService.changePassword).mockResolvedValue({ message: 'ok' } as never);

    renderCard();
    await fillAndSubmit();

    await waitFor(() =>
      expect(notify.success).toHaveBeenCalledWith(
        'Password updated. Other devices were signed out.',
      ),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
});
