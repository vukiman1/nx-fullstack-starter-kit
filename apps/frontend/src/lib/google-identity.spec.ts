import {
  ensureGoogleIdentity,
  promptGoogleOneTap,
  resetGoogleIdentityForTests,
} from './google-identity';

const initialize = jest.fn();
const prompt = jest.fn();

describe('google-identity', () => {
  beforeEach(() => {
    initialize.mockReset();
    prompt.mockReset();
    resetGoogleIdentityForTests();
    window.google = {
      accounts: { id: { initialize, prompt, renderButton: jest.fn(), cancel: jest.fn() } },
    };
  });

  it('initializes GIS exactly once even across repeated calls', async () => {
    const callback = jest.fn();
    await ensureGoogleIdentity({ clientId: 'client-1', callback });
    await ensureGoogleIdentity({ clientId: 'client-1', callback });

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(initialize).toHaveBeenCalledWith(
      expect.objectContaining({ client_id: 'client-1', use_fedcm_for_prompt: true }),
    );
  });

  it('forwards the credential string to the caller callback', async () => {
    const callback = jest.fn();
    await ensureGoogleIdentity({ clientId: 'client-1', callback });
    const gisCallback = initialize.mock.calls[0][0].callback;

    gisCallback({ credential: 'abc' });

    expect(callback).toHaveBeenCalledWith('abc');
  });

  it('prompts through the initialized api', async () => {
    await ensureGoogleIdentity({ clientId: 'client-1', callback: jest.fn() });
    promptGoogleOneTap();

    expect(prompt).toHaveBeenCalledTimes(1);
  });
});
