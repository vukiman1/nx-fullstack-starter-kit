import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileResponse {
  success: boolean;
  'error-codes'?: string[];
}

@Injectable()
export class CaptchaService {
  private readonly enabled: boolean;
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('captcha.enabled') ?? false;
    this.secretKey = this.configService.get<string>('captcha.secretKey') ?? '';
    if (this.enabled && !this.secretKey) {
      throw new Error('CAPTCHA_SECRET_KEY is required when CAPTCHA_ENABLED=true');
    }
  }

  async verify(token: string | undefined): Promise<void> {
    if (!this.enabled) {
      return;
    }
    if (!token) {
      throw new BadRequestException('Captcha token is required');
    }
    const outcome = await this.requestSiteverify(token);
    if (!outcome.success) {
      throw new UnauthorizedException('Captcha verification failed');
    }
  }

  private async requestSiteverify(token: string): Promise<TurnstileResponse> {
    const body = new URLSearchParams({ secret: this.secretKey, response: token });
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    return (await response.json()) as TurnstileResponse;
  }
}
