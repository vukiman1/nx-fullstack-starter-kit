import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '@org/backend-crypto';
import { buildOtpauthUri, generateCode, generateSecret, verifyCode } from './totp';

// Widening this extends how long a stolen code stays usable: at 30s a code lives up to 90s.
const CLOCK_TOLERANCE_SECONDS = 30;

export interface TotpEnrolment {
  readonly encryptedSecret: string;
  /** Contains the secret in the clear — never store or log it. */
  readonly otpauthUri: string;
}

@Injectable()
export class TotpService {
  constructor(
    private readonly cryptoService: CryptoService,
    private readonly configService: ConfigService,
  ) {}

  createEnrolment(accountLabel: string): TotpEnrolment {
    const secret = generateSecret();
    return {
      encryptedSecret: this.cryptoService.encryptData(secret),
      otpauthUri: buildOtpauthUri(secret, accountLabel, this.issuer()),
    };
  }

  buildUri(encryptedSecret: string, accountLabel: string): string {
    return buildOtpauthUri(
      this.cryptoService.decryptData(encryptedSecret),
      accountLabel,
      this.issuer(),
    );
  }

  verify(encryptedSecret: string, token: string): boolean {
    const candidate = token.replace(/\s/g, '');
    if (!/^\d{6}$/.test(candidate)) {
      return false;
    }

    const secret = this.cryptoService.decryptData(encryptedSecret);
    return verifyCode(secret, candidate, CLOCK_TOLERANCE_SECONDS);
  }

  /** Only for tests and tooling that need a live code for a known secret. */
  generateFor(encryptedSecret: string): string {
    return generateCode(this.cryptoService.decryptData(encryptedSecret));
  }

  private issuer(): string {
    return this.configService.get<string>('app.name') ?? 'App';
  }
}
