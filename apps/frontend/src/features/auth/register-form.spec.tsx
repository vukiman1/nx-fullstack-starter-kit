import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { RegisterForm } from './register-form';
import { authService } from '@/services/auth-service';
import { notify } from '@/lib/toast';
import { ApiError } from '@/lib/api-error';

jest.mock('@/services/auth-service', () => ({
  authService: { register: jest.fn(), resendVerification: jest.fn(), verifyEmail: jest.fn() },
}));
const mockOnVerified = jest.fn();

jest.mock('@/lib/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

interface FillOptions {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

function fill({
  displayName = 'Jane Doe',
  email = 'new@example.com',
  password = 'Str0ngPass',
  ...rest
}: FillOptions = {}) {
  const confirmPassword = rest.confirmPassword ?? password;
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: displayName } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirm password'), {
    target: { value: confirmPassword },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
}

function apiError(message: string, statusCode = 409) {
  return new ApiError({ statusCode, success: false, errors: { message } } as never);
}

describe('RegisterForm', () => {
  beforeEach(() => jest.clearAllMocks());

  it('applies the same password rule as the server before sending anything', async () => {
    render(<RegisterForm onVerified={mockOnVerified} />);

    fill({ password: 'allletters' });

    expect(await screen.findByText(/at least one letter and one number/i)).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('catches a mismatch between the two password fields', async () => {
    render(<RegisterForm onVerified={mockOnVerified} />);

    fill({ password: 'Str0ngPass', confirmPassword: 'Str0ngPas5' });

    expect(await screen.findByText('Passwords do not match.')).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('requires a name', async () => {
    render(<RegisterForm onVerified={mockOnVerified} />);

    fill({ displayName: '' });

    expect(await screen.findByText('Enter your name.')).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('requires an email address', async () => {
    render(<RegisterForm onVerified={mockOnVerified} />);

    // A malformed address never reaches this code: input type="email" makes the browser block
    // submission first. What the form has to catch is an empty field.
    fill({ email: '' });

    expect(await screen.findByText('Enter a valid email address.')).toBeTruthy();
    expect(authService.register).not.toHaveBeenCalled();
  });

  it('sends the whole payload the server expects', async () => {
    jest
      .mocked(authService.register)
      .mockResolvedValue({ message: 'ok', email: 'new@example.com' });

    render(<RegisterForm onVerified={mockOnVerified} />);
    fill();

    await waitFor(() =>
      expect(authService.register).toHaveBeenCalledWith({
        displayName: 'Jane Doe',
        email: 'new@example.com',
        password: 'Str0ngPass',
        confirmPassword: 'Str0ngPass',
      }),
    );
  });

  it('does not sign the user in — it asks for the code from the email', async () => {
    jest
      .mocked(authService.register)
      .mockResolvedValue({ message: 'ok', email: 'new@example.com' });

    render(<RegisterForm onVerified={mockOnVerified} />);
    fill();

    expect(await screen.findByLabelText('Verification code')).toBeTruthy();
    expect(screen.getByText('new@example.com')).toBeTruthy();
    expect(screen.queryByLabelText('Password')).toBeNull();
  });

  it('can send another code to the same address', async () => {
    jest
      .mocked(authService.register)
      .mockResolvedValue({ message: 'ok', email: 'new@example.com' });
    jest.mocked(authService.resendVerification).mockResolvedValue({ message: 'Sent again.' });

    render(<RegisterForm onVerified={mockOnVerified} />);
    fill();
    fireEvent.click(await screen.findByRole('button', { name: 'Send another code' }));

    await waitFor(() =>
      expect(authService.resendVerification).toHaveBeenCalledWith('new@example.com'),
    );
    await waitFor(() => expect(notify.info).toHaveBeenCalledWith('Sent again.'));
  });

  it('shows the server message when the address is already taken', async () => {
    jest.mocked(authService.register).mockRejectedValue(apiError('Email already exists'));

    render(<RegisterForm onVerified={mockOnVerified} />);
    fill();

    expect(await screen.findByText('Email already exists')).toBeTruthy();
  });

  it('surfaces a field-specific server error, which arrives without a message key', async () => {
    // The backend reports validation failures as { password: '...' }, not { message: '...' }.
    jest.mocked(authService.register).mockRejectedValue(
      new ApiError({
        statusCode: 400,
        success: false,
        errors: { password: 'password must contain at least one letter and one number' },
      } as never),
    );

    render(<RegisterForm onVerified={mockOnVerified} />);
    fill();

    expect(
      await screen.findByText('password must contain at least one letter and one number'),
    ).toBeTruthy();
  });
});
