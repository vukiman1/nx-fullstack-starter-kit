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
