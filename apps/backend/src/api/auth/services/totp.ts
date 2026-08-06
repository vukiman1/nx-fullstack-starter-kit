import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

/**
 * RFC 6238 (TOTP) over RFC 4648 base32, in the shape Google Authenticator expects: SHA-1, 30
 * second steps, six digits.
 *
 * Written out rather than taken from a library because every maintained option ships ESM only,
 * which breaks both the jest run and the bundled serverless function — the algorithm itself is
 * an HMAC and a truncation.
 */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const DIGITS = 6;
const SECRET_BYTES = 20;

export function generateSecret(): string {
  return base32Encode(randomBytes(SECRET_BYTES));
}

export function generateCode(secret: string, atMs: number = Date.now()): string {
  return codeForCounter(base32Decode(secret), Math.floor(atMs / 1000 / STEP_SECONDS));
}

/**
 * @param toleranceSeconds how far the client clock may drift either side of now.
 */
export function verifyCode(
  secret: string,
  token: string,
  toleranceSeconds = 0,
  atMs: number = Date.now(),
): boolean {
  if (!new RegExp(`^\\d{${DIGITS}}$`).test(token)) {
    return false;
  }

  const key = base32Decode(secret);
  const counter = Math.floor(atMs / 1000 / STEP_SECONDS);
  const steps = Math.floor(toleranceSeconds / STEP_SECONDS);

  for (let offset = -steps; offset <= steps; offset += 1) {
    if (equalsInConstantTime(codeForCounter(key, counter + offset), token)) {
      return true;
    }
  }
  return false;
}

export function buildOtpauthUri(secret: string, label: string, issuer: string): string {
  const account = `${encodeURIComponent(issuer)}:${encodeURIComponent(label)}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${account}?${params.toString()}`;
}

function codeForCounter(key: Buffer, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(Math.max(counter, 0)));

  const digest = createHmac('sha1', key).update(message).digest();
  // Dynamic truncation: the low nibble of the last byte picks where the 31-bit value starts.
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = digest.readUInt32BE(offset) & 0x7fffffff;

  return String(binary % 10 ** DIGITS).padStart(DIGITS, '0');
}

function base32Encode(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of input.replace(/=+$/, '').toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) {
      throw new Error('Secret is not valid base32');
    }
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function equalsInConstantTime(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
