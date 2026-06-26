import { ConfigService } from '@nestjs/config';
import { CryptoService } from './crypto.service';

function makeService(secretKey: string | undefined): CryptoService {
  const configService = { get: () => secretKey } as unknown as ConfigService;
  return new CryptoService(configService);
}

function tamper(ciphertext: string): string {
  const buffer = Buffer.from(ciphertext, 'base64');
  buffer[buffer.length - 1] ^= 0xff;
  return buffer.toString('base64');
}

describe('CryptoService', () => {
  const service = makeService('a'.repeat(32));

  it('returns the original plaintext after an encrypt/decrypt round-trip', () => {
    const plaintext = 'hello-世界-123';
    expect(service.decryptData(service.encryptData(plaintext))).toBe(plaintext);
  });

  it('produces different ciphertext for the same input thanks to a random IV', () => {
    expect(service.encryptData('same-input')).not.toBe(service.encryptData('same-input'));
  });

  it('rejects ciphertext whose authentication tag no longer matches', () => {
    const tampered = tamper(service.encryptData('secret-payload'));
    expect(() => service.decryptData(tampered)).toThrow();
  });

  it('fails fast when the secret key is not configured', () => {
    expect(() => makeService('').encryptData('x')).toThrow('SECRET_KEY is not configured');
  });
});
