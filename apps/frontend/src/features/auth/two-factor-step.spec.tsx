import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TwoFactorStep } from './two-factor-step';
import { authService } from '@/services/auth-service';
import { startSession } from './session';
import { ApiError } from '@/lib/api-error';

jest.mock('@/services/auth-service', () => ({
  authService: { verifyTwoFactor: jest.fn(), requestTwoFactorRecovery: jest.fn() },
}));
jest.mock('./session', () => ({ startSession: jest.fn() }));
jest.mock('@/lib/toast', () => ({
  notify: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
jest.mock('./use-auth-modal', () => ({
  useAuthModal: () => ({ finish: jest.fn().mockResolvedValue(undefined) }),
}));

function renderStep(onExpired = jest.fn()) {
  render(<TwoFactorStep challengeToken="challenge-1" onExpired={onExpired} />);
  return onExpired;
}

function submitCode(code: string) {
  fireEvent.change(screen.getByLabelText('Verification code'), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: 'Verify' }));
}

function apiError(message: string, statusCode = 401) {
  return new ApiError({ statusCode, success: false, errors: { message } } as never);
}

describe('TwoFactorStep', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not start a session until the code is verified', () => {
    renderStep();

    expect(startSession).not.toHaveBeenCalled();
  });

  it('starts the session once the server accepts the code', async () => {
    jest
      .mocked(authService.verifyTwoFactor)
      .mockResolvedValue({ user: { email: 'a@b.c' } } as never);

    renderStep();
    submitCode('123456');

    await waitFor(() => expect(startSession).toHaveBeenCalled());
  });

  it('keeps the user on this step when the code is wrong', async () => {
    jest.mocked(authService.verifyTwoFactor).mockRejectedValue(apiError('That code is not valid'));
    const onExpired = renderStep();

    submitCode('000000');

    expect(await screen.findByText('That code is not valid')).toBeTruthy();
    expect(startSession).not.toHaveBeenCalled();
    expect(onExpired).not.toHaveBeenCalled();
  });

  it('sends the user back to the password step once the challenge is spent', async () => {
    // 410, not 401: a wrong code is recoverable here, a spent challenge is not.
    jest
      .mocked(authService.verifyTwoFactor)
      .mockRejectedValue(apiError('Too many attempts. Please sign in again.', 410));
    const onExpired = renderStep();

    submitCode('000000');

    await waitFor(() => expect(onExpired).toHaveBeenCalled());
    expect(startSession).not.toHaveBeenCalled();
  });

  it('offers email recovery, and only asks once', async () => {
    jest
      .mocked(authService.requestTwoFactorRecovery)
      .mockResolvedValue({ message: 'Check your inbox.' });

    renderStep();
    const link = screen.getByRole('button', { name: /Lost your device/i });
    fireEvent.click(link);

    await waitFor(() =>
      expect(authService.requestTwoFactorRecovery).toHaveBeenCalledWith('challenge-1'),
    );
    expect(await screen.findByText(/Check your inbox for the recovery link/i)).toBeTruthy();
  });

  it('sends the user back to the password step if the challenge died while asking', async () => {
    jest
      .mocked(authService.requestTwoFactorRecovery)
      .mockRejectedValue(apiError('That sign-in attempt has expired.', 410));
    const onExpired = renderStep();

    fireEvent.click(screen.getByRole('button', { name: /Lost your device/i }));

    await waitFor(() => expect(onExpired).toHaveBeenCalled());
  });

  it('accepts a recovery code, which is longer than six digits', async () => {
    jest
      .mocked(authService.verifyTwoFactor)
      .mockResolvedValue({ user: { email: 'a@b.c' } } as never);

    renderStep();
    submitCode('abcdef1234');

    await waitFor(() =>
      expect(authService.verifyTwoFactor).toHaveBeenCalledWith('challenge-1', 'abcdef1234'),
    );
  });
});
