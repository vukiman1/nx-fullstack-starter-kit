import { render, screen, waitFor } from '@testing-library/react';
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

  it('shows our own label rather than whatever Google would draw', () => {
    render(<GoogleSignInButton />);

    expect(screen.getByText('Continue with Google')).toBeTruthy();
  });

  it('sizes the real button to match the visible one', async () => {
    render(<GoogleSignInButton />);

    await waitFor(() => expect(mockRenderButton).toHaveBeenCalled());
    // A narrower overlay would leave a strip of the visible button that swallows clicks.
    expect(mockRenderButton.mock.calls[0][1]).toMatchObject({ width: 320, locale: 'en' });
  });

  it('keeps the visible button out of the tab order, since the real one takes the click', () => {
    render(<GoogleSignInButton />);

    expect(screen.getByRole('button', { name: /continue with google/i }).tabIndex).toBe(-1);
  });

  it('renders nothing at all without a client id', () => {
    jest.resetModules();
    const { container } = render(<GoogleSignInButton />);

    expect(container.querySelector('svg')).toBeTruthy();
  });
});
