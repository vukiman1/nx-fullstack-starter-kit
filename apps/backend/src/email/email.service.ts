import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { render } from '@react-email/render';
import { Resend } from 'resend';
import { EmailSendError } from './email.errors';
import { WelcomeEmail } from './templates/welcome.email';
import { VerifyEmail } from './templates/verify-email.email';
import { ResetPasswordEmail } from './templates/reset-password.email';
import { TwoFactorRecoveryEmail } from './templates/two-factor-recovery.email';

const VERIFY_EMAIL_PATH = '/verify-email';
const RESET_PASSWORD_PATH = '/reset-password';
const TWO_FACTOR_RECOVERY_PATH = '/two-factor-recovery';

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

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    const verifyUrl = this.buildLink(VERIFY_EMAIL_PATH, token);
    const html = await render(VerifyEmail({ verifyUrl }));
    await this.send({ to, subject: 'Confirm your email', html });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<void> {
    const resetUrl = this.buildLink(RESET_PASSWORD_PATH, token);
    const html = await render(ResetPasswordEmail({ resetUrl }));
    await this.send({ to, subject: 'Reset your password', html });
  }

  async sendTwoFactorRecoveryEmail(to: string, token: string): Promise<void> {
    const recoveryUrl = this.buildLink(TWO_FACTOR_RECOVERY_PATH, token);
    const html = await render(TwoFactorRecoveryEmail({ recoveryUrl }));
    await this.send({ to, subject: 'Turn off two-factor authentication', html });
  }

  private buildLink(path: string, token: string): string {
    return `${this.appUrl}${path}?token=${encodeURIComponent(token)}`;
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
