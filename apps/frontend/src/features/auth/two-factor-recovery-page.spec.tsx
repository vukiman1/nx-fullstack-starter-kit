import { render, screen, waitFor } from '@testing-library/react';
import { TwoFactorRecoveryPage } from './two-factor-recovery-page';
import { authService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';

const search: { token?: string } = {};

jest.mock('@tanstack/react-router', () => ({
  useSearch: () => search,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
jest.mock('@/services/auth-service', () => ({
  authService: { confirmTwoFactorRecovery: jest.fn() },
}));

describe('TwoFactorRecoveryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search.token = 'recovery-token';
  });

  it('spends the token from the link', async () => {
    jest
      .mocked(authService.confirmTwoFactorRecovery)
      .mockResolvedValue({ message: 'Two-factor authentication is off.' });

    render(<TwoFactorRecoveryPage />);

    await waitFor(() =>
      expect(authService.confirmTwoFactorRecovery).toHaveBeenCalledWith('recovery-token'),
    );
    expect(await screen.findByText('Two-factor authentication is off.')).toBeTruthy();
  });

  it('calls the endpoint once, since the link is single-use', async () => {
    jest.mocked(authService.confirmTwoFactorRecovery).mockResolvedValue({ message: 'ok' });

    const { rerender } = render(<TwoFactorRecoveryPage />);
    rerender(<TwoFactorRecoveryPage />);

    await waitFor(() => expect(authService.confirmTwoFactorRecovery).toHaveBeenCalledTimes(1));
  });

  it('reports a link that has already been used', async () => {
    jest.mocked(authService.confirmTwoFactorRecovery).mockRejectedValue(
      new ApiError({
        statusCode: 400,
        success: false,
        errors: { message: 'That link is invalid or has expired' },
      } as never),
    );

    render(<TwoFactorRecoveryPage />);

    expect(await screen.findByText('That link is invalid or has expired')).toBeTruthy();
  });

  it('does not call the server when the link has no token', async () => {
    search.token = undefined;

    render(<TwoFactorRecoveryPage />);

    expect(await screen.findByText(/missing its token/i)).toBeTruthy();
    expect(authService.confirmTwoFactorRecovery).not.toHaveBeenCalled();
  });
});
