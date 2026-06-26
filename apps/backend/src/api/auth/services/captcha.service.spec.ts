import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptchaService } from './captcha.service';

function makeService(enabled: boolean, secretKey: string): CaptchaService {
  const values: Record<string, unknown> = {
    'captcha.enabled': enabled,
    'captcha.secretKey': secretKey,
  };
  const configService = { get: (key: string) => values[key] } as unknown as ConfigService;
  return new CaptchaService(configService);
}

function mockFetchResolving(success: boolean): jest.SpyInstance {
  return jest
    .spyOn(global, 'fetch')
    .mockResolvedValue({ json: () => Promise.resolve({ success }) } as Response);
}

describe('CaptchaService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('skips verification entirely when disabled', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');
    await expect(makeService(false, '').verify(undefined)).resolves.toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails fast at construction when enabled without a secret key', () => {
    expect(() => makeService(true, '')).toThrow();
  });

  it('rejects a missing token when enabled', async () => {
    await expect(makeService(true, 'secret').verify(undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('passes when the provider confirms the token', async () => {
    mockFetchResolving(true);
    await expect(makeService(true, 'secret').verify('token')).resolves.toBeUndefined();
  });

  it('rejects when the provider denies the token', async () => {
    mockFetchResolving(false);
    await expect(makeService(true, 'secret').verify('token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
