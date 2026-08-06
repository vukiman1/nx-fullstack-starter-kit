import { CryptoService } from '@org/backend-crypto';
import { ConfigService } from '@nestjs/config';
import { TotpService } from './totp.service';

function buildService(): TotpService {
  const config = {
    get: (key: string) => (key === 'crypto.secretKey' ? 'test-secret-key' : 'My Workspace'),
  } as unknown as ConfigService;

  return new TotpService(new CryptoService(config), config);
}

describe('TotpService', () => {
  const service = buildService();

  it('never hands back a secret that could be stored in the clear', () => {
    const { encryptedSecret, otpauthUri } = service.createEnrolment('a@b.c');

    const secretInUri = new URL(otpauthUri).searchParams.get('secret');
    expect(secretInUri).toBeTruthy();
    expect(encryptedSecret).not.toContain(secretInUri as string);
  });

  it('puts the account and issuer in the QR payload so the app labels it', () => {
    const { otpauthUri } = service.createEnrolment('a@b.c');

    expect(decodeURIComponent(otpauthUri)).toContain('a@b.c');
    expect(decodeURIComponent(otpauthUri)).toContain('My Workspace');
  });

  it('accepts the code its own secret produces', () => {
    const { encryptedSecret } = service.createEnrolment('a@b.c');

    expect(service.verify(encryptedSecret, service.generateFor(encryptedSecret))).toBe(true);
  });

  it('rejects a code belonging to a different secret', () => {
    const mine = service.createEnrolment('a@b.c');
    const theirs = service.createEnrolment('c@d.e');

    expect(service.verify(mine.encryptedSecret, service.generateFor(theirs.encryptedSecret))).toBe(
      false,
    );
  });

  it('tolerates the spaces authenticator apps show between digits', () => {
    const { encryptedSecret } = service.createEnrolment('a@b.c');
    const code = service.generateFor(encryptedSecret);

    expect(service.verify(encryptedSecret, `${code.slice(0, 3)} ${code.slice(3)}`)).toBe(true);
  });

  it('still accepts a code from the previous 30s step, for clocks that lag', () => {
    const { encryptedSecret } = service.createEnrolment('a@b.c');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now - 30_000);
    const staleCode = service.generateFor(encryptedSecret);
    jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(service.verify(encryptedSecret, staleCode)).toBe(true);
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('rejects a code that has aged well past the tolerated drift', () => {
    const { encryptedSecret } = service.createEnrolment('a@b.c');
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now - 300_000);
    const oldCode = service.generateFor(encryptedSecret);
    jest.spyOn(Date, 'now').mockReturnValue(now);

    expect(service.verify(encryptedSecret, oldCode)).toBe(false);
    jest.spyOn(Date, 'now').mockRestore();
  });

  it.each([['12345'], ['1234567'], ['abcdef'], [''], ['12 34']])(
    'rejects malformed input %p without touching the secret',
    (input) => {
      const { encryptedSecret } = service.createEnrolment('a@b.c');

      expect(service.verify(encryptedSecret, input)).toBe(false);
    },
  );
});
