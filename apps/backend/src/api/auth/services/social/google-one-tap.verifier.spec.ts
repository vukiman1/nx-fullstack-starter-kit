import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthProvider } from '@org/backend-enum';
import { GoogleOneTapVerifier } from './google-one-tap.verifier';

const verifyIdToken = jest.fn();
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({ verifyIdToken })),
}));

function ticket(overrides: Record<string, unknown> = {}) {
  return {
    getPayload: () => ({
      sub: 'google-sub-1',
      email: 'jane@example.com',
      email_verified: true,
      name: 'Jane',
      picture: 'https://pic',
      ...overrides,
    }),
  };
}

describe('GoogleOneTapVerifier', () => {
  let verifier: GoogleOneTapVerifier;

  beforeEach(() => {
    verifyIdToken.mockReset();
    const config = {
      get: jest.fn((key: string) => (key === 'google.clientId' ? 'client-123' : undefined)),
    } as unknown as ConfigService;
    verifier = new GoogleOneTapVerifier(config);
  });

  it('returns a normalized identity for a valid verified token', async () => {
    verifyIdToken.mockResolvedValue(ticket());

    const identity = await verifier.verify('good-token');

    expect(identity).toEqual({
      provider: AuthProvider.GOOGLE,
      providerAccountId: 'google-sub-1',
      email: 'jane@example.com',
      emailVerified: true,
      displayName: 'Jane',
      avatar: 'https://pic',
    });
    expect(verifyIdToken).toHaveBeenCalledWith({ idToken: 'good-token', audience: 'client-123' });
  });

  it('rejects an unverified email with 403', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email_verified: false }));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a token with no email with 403', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email: undefined }));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an invalid token with 401', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad token'));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token whose audience belongs to another app', async () => {
    // google-auth-library throws when aud does not match the audience we pass in; the point of
    // this test is that we do pass it, so a valid token minted for a different client is refused
    verifyIdToken.mockRejectedValue(new Error('Wrong recipient, payload audience != requiredAud'));

    await expect(verifier.verify('token-for-another-app')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verifyIdToken).toHaveBeenCalledWith(expect.objectContaining({ audience: 'client-123' }));
  });

  it('rejects a token that verifies but carries no payload', async () => {
    verifyIdToken.mockResolvedValue({ getPayload: () => undefined });
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('treats a missing email_verified claim as unverified', async () => {
    verifyIdToken.mockResolvedValue(ticket({ email_verified: undefined }));
    await expect(verifier.verify('t')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('accepts a token without optional profile fields', async () => {
    verifyIdToken.mockResolvedValue(ticket({ name: undefined, picture: undefined }));

    const identity = await verifier.verify('t');

    expect(identity).toMatchObject({
      providerAccountId: 'google-sub-1',
      email: 'jane@example.com',
      displayName: undefined,
      avatar: undefined,
    });
  });
});
