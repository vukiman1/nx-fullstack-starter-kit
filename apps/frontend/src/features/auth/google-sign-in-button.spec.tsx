import { render, waitFor } from '@testing-library/react';
import { GoogleSignInButton } from './google-sign-in-button';
import { ensureGoogleIdentity } from '@/lib/google-identity';

jest.mock('@/config/app-config', () => ({
  appConfig: { google: { clientId: 'test-client-id' } },
}));
jest.mock('@/lib/google-identity', () => ({
  ensureGoogleIdentity: jest.fn(),
}));

const mockRenderButton = jest.fn();

describe('GoogleSignInButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(ensureGoogleIdentity)
      .mockResolvedValue({ renderButton: mockRenderButton } as never);
  });

  it('renders the official Google button into its container', async () => {
    render(<GoogleSignInButton />);

    await waitFor(() => expect(ensureGoogleIdentity).toHaveBeenCalled());
    await waitFor(() => expect(mockRenderButton).toHaveBeenCalledTimes(1));
    expect(mockRenderButton.mock.calls[0][0]).toBeInstanceOf(HTMLElement);
  });
});
