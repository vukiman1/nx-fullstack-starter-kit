import { authService } from './auth-service';
import { httpRequest } from '@/lib/http-request';

jest.mock('@/lib/http-request', () => ({
  httpRequest: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));

describe('authService.googleOneTap', () => {
  beforeEach(() => jest.mocked(httpRequest.post).mockReset());

  it('posts the credential to the one-tap endpoint', async () => {
    const response = { user: { email: 'jane@example.com' } };
    jest.mocked(httpRequest.post).mockResolvedValue(response);

    const result = await authService.googleOneTap('cred-1');

    expect(httpRequest.post).toHaveBeenCalledWith('/auth/google/one-tap', { credential: 'cred-1' });
    expect(result).toEqual(response);
  });
});

describe('authService account management', () => {
  beforeEach(() => jest.clearAllMocks());

  it('sends a password change to the change-password endpoint', async () => {
    jest.mocked(httpRequest.post).mockResolvedValue({ message: 'ok' });

    await authService.changePassword({
      currentPassword: 'old-one',
      newPassword: 'new-one',
      confirmPassword: 'new-one',
    });

    expect(httpRequest.post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old-one',
      newPassword: 'new-one',
      confirmPassword: 'new-one',
    });
  });

  it('asks for a password reset email', async () => {
    jest.mocked(httpRequest.post).mockResolvedValue({ message: 'ok' });

    await authService.forgotPassword('jane@example.com');

    expect(httpRequest.post).toHaveBeenCalledWith('/auth/forgot-password', {
      email: 'jane@example.com',
    });
  });

  it('revokes other sessions through the collection route', async () => {
    jest.mocked(httpRequest.delete).mockResolvedValue({ message: 'ok' });

    await authService.revokeOtherSessions();

    expect(httpRequest.delete).toHaveBeenCalledWith('/auth/sessions');
  });
});
