import { buildOtpauthUri, generateCode, generateSecret, verifyCode } from './totp';

/**
 * RFC 6238 Appendix B, SHA-1 rows. The seed is the ASCII string "12345678901234567890", which is
 * "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ" in base32. Checking against the published vectors is the
 * only way to know this implementation matches every authenticator app.
 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('totp', () => {
  it.each([
    [59, '287082'],
    [1111111109, '081804'],
    [1111111111, '050471'],
    [1234567890, '005924'],
    [2000000000, '279037'],
    [20000000000, '353130'],
  ])('matches the RFC 6238 vector at t=%i', (seconds, expected) => {
    expect(generateCode(RFC_SECRET, seconds * 1000)).toBe(expected);
  });

  it('accepts the code it just produced', () => {
    const secret = generateSecret();

    expect(verifyCode(secret, generateCode(secret))).toBe(true);
  });

  it('rejects a code from a different secret', () => {
    const mine = generateSecret();
    const theirs = generateSecret();

    expect(verifyCode(mine, generateCode(theirs))).toBe(false);
  });

  it.each([['12345'], ['1234567'], ['abcdef'], ['']])('rejects malformed input %p', (token) => {
    expect(verifyCode(generateSecret(), token)).toBe(false);
  });

  describe('clock drift', () => {
    const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const now = 1111111111 * 1000;

    it('accepts the previous step when tolerance allows it', () => {
      const previous = generateCode(secret, now - 30_000);

      expect(verifyCode(secret, previous, 30, now)).toBe(true);
    });

    it('rejects that same code with no tolerance', () => {
      const previous = generateCode(secret, now - 30_000);

      expect(verifyCode(secret, previous, 0, now)).toBe(false);
    });

    it('rejects a code well outside the tolerated window', () => {
      const stale = generateCode(secret, now - 300_000);

      expect(verifyCode(secret, stale, 30, now)).toBe(false);
    });
  });

  describe('secrets', () => {
    it('produces base32 an authenticator app can read', () => {
      expect(generateSecret()).toMatch(/^[A-Z2-7]+$/);
    });

    it('does not repeat itself', () => {
      expect(generateSecret()).not.toBe(generateSecret());
    });
  });

  it('labels the QR payload with the issuer and account', () => {
    const uri = buildOtpauthUri('GEZDGNBVGY3TQOJQ', 'a@b.c', 'My Workspace');

    expect(decodeURIComponent(uri)).toContain('My Workspace:a@b.c');
    expect(new URL(uri).searchParams.get('secret')).toBe('GEZDGNBVGY3TQOJQ');
    expect(new URL(uri).searchParams.get('period')).toBe('30');
  });
});
