import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { VerificationCodeEmail } from './templates/verification-code.email';
import { Resend } from 'resend';
import { EmailSendError } from './email.errors';
import { WelcomeEmail } from './templates/welcome.email';

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('email.resendApiKey');
    this.from = this.configService.get<string>('email.from') ?? '';
    this.appUrl = this.configService.get<string>('app.url') ?? '';
    this.resend = apiKey ? new Resend(apiKey) : null;

    if (!this.resend) {
      this.logger.warn('RESEND_API_KEY is empty — outgoing emails will be skipped');
    }
  }

  async sendWelcomeEmail(to: string): Promise<void> {
    const html = await render(WelcomeEmail({ email: to, appUrl: this.appUrl }));
    await this.send({ to, subject: 'Welcome aboard 🎉', html });
  }

  async sendVerificationCode(to: string, code: string, expiryMinutes: number): Promise<void> {
    const html = await render(
      VerificationCodeEmail({
        heading: 'Confirm your email',
        intro: 'Enter this code to finish setting up your account.',
        code,
        expiryMinutes,
      }),
    );
    await this.send({ to, subject: `${code} is your confirmation code`, html });
  }

  async sendPasswordResetCode(to: string, code: string, expiryMinutes: number): Promise<void> {
    const html = await render(
      VerificationCodeEmail({
        heading: 'Reset your password',
        intro: 'Enter this code to choose a new password.',
        code,
        expiryMinutes,
      }),
    );
    await this.send({ to, subject: `${code} is your password reset code`, html });
  }

  async sendTwoFactorRecoveryCode(to: string, code: string, expiryMinutes: number): Promise<void> {
    const html = await render(
      VerificationCodeEmail({
        heading: 'Turn off two-factor authentication',
        intro:
          'Enter this code to switch two-factor off. Every signed-in device will be signed out.',
        code,
        expiryMinutes,
      }),
    );
    await this.send({ to, subject: `${code} is your recovery code`, html });
  }

  private async send({ to, subject, html }: SendEmailParams): Promise<void> {
    if (!this.resend) {
      this.logger.warn(`Email to ${to} skipped (no API key): ${subject}`);
      return;
    }

    const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
    if (error) {
      throw new EmailSendError(to, error.message);
    }
  }
}
