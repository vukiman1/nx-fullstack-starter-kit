import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ResetPasswordPage } from './reset-password-page';
import { authService } from '@/services/auth-service';
import { ApiError } from '@/lib/api-error';

const search: { token?: string } = {};

jest.mock('@tanstack/react-router', () => ({
  useSearch: () => search,
  Link: ({ children }: { children: React.ReactNode }) => <a href="/">{children}</a>,
}));
jest.mock('@/services/auth-service', () => ({ authService: { resetPassword: jest.fn() } }));

function fill(password: string, confirmPassword = password) {
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search.token = 'reset-token';
  });

  it('refuses a link with no token instead of showing a form that cannot work', () => {
    search.token = undefined;

    render(<ResetPasswordPage />);

    expect(screen.getByText(/missing its token/i)).toBeTruthy();
    expect(screen.queryByLabelText('New password')).toBeNull();
  });

  it('applies the same password rule as the server, before sending anything', async () => {
    render(<ResetPasswordPage />);

    fill('allletters');

    expect(await screen.findByText(/at least one letter and one number/i)).toBeTruthy();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('catches a mismatch between the two fields', async () => {
    render(<ResetPasswordPage />);

    fill('Str0ngPass', 'Str0ngPas5');

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(authService.resetPassword).not.toHaveBeenCalled();
  });

  it('sends the token from the link along with the new password', async () => {
    jest.mocked(authService.resetPassword).mockResolvedValue({ message: 'ok' });

    render(<ResetPasswordPage />);
    fill('Str0ngPass');

    await waitFor(() =>
      expect(authService.resetPassword).toHaveBeenCalledWith({
        token: 'reset-token',
        password: 'Str0ngPass',
        confirmPassword: 'Str0ngPass',
      }),
    );
  });

  it('tells the user every device was signed out', async () => {
    jest.mocked(authService.resetPassword).mockResolvedValue({ message: 'ok' });

    render(<ResetPasswordPage />);
    fill('Str0ngPass');

    expect(await screen.findByText(/signed out/i)).toBeTruthy();
  });

  it('shows the server message when the link has already been used', async () => {
    jest.mocked(authService.resetPassword).mockRejectedValue(
      new ApiError({
        statusCode: 400,
        success: false,
        errors: { message: 'Invalid or expired reset token' },
      } as never),
    );

    render(<ResetPasswordPage />);
    fill('Str0ngPass');

    expect(await screen.findByText('Invalid or expired reset token')).toBeTruthy();
  });
});
