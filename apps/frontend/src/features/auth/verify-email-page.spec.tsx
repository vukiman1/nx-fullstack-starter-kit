import { render, screen, waitFor } from '@testing-library/react';
import { VerifyEmailPage } from './verify-email-page';
import { authService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';

const search: { token?: string } = {};

jest.mock('@tanstack/react-router', () => ({
  useSearch: () => search,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
jest.mock('@/services/auth-service', () => ({ authService: { verifyEmail: jest.fn() } }));

describe('VerifyEmailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search.token = 'verify-token';
  });

  it('spends the token once, even across re-renders', async () => {
    jest.mocked(authService.verifyEmail).mockResolvedValue({ message: 'Email verified.' });

    const { rerender } = render(<VerifyEmailPage />);
    rerender(<VerifyEmailPage />);

    await waitFor(() => expect(authService.verifyEmail).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Email verified.')).toBeTruthy();
  });

  it('shows the server message for a used or expired link', async () => {
    jest.mocked(authService.verifyEmail).mockRejectedValue(
      new ApiError({
        statusCode: 400,
        success: false,
        errors: { message: 'Invalid or expired token' },
      } as never),
    );

    render(<VerifyEmailPage />);

    expect(await screen.findByText('Invalid or expired token')).toBeTruthy();
  });

  it('does not call the server without a token', async () => {
    search.token = undefined;

    render(<VerifyEmailPage />);

    expect(await screen.findByText(/missing its token/i)).toBeTruthy();
    expect(authService.verifyEmail).not.toHaveBeenCalled();
  });
});
