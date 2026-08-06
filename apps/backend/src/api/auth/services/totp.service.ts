import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '@org/backend-crypto';
import { generateSecret, generateSync, generateURI, verifySync } from 'otplib';

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
      otpauthUri: String(generateURI({ secret, label: accountLabel, issuer: this.issuer() })),
    };
  }

  buildUri(encryptedSecret: string, accountLabel: string): string {
    return String(
      generateURI({
        secret: this.cryptoService.decryptData(encryptedSecret),
        label: accountLabel,
        issuer: this.issuer(),
      }),
    );
  }

  verify(encryptedSecret: string, token: string): boolean {
    const candidate = token.replace(/\s/g, '');
    if (!/^\d{6}$/.test(candidate)) {
      return false;
    }

    const secret = this.cryptoService.decryptData(encryptedSecret);
    return verifySync({ token: candidate, secret, epochTolerance: CLOCK_TOLERANCE_SECONDS }).valid;
  }

  /** Only for tests and tooling that need a live code for a known secret. */
  generateFor(encryptedSecret: string): string {
    return generateSync({ secret: this.cryptoService.decryptData(encryptedSecret) });
  }

  private issuer(): string {
    return this.configService.get<string>('app.name') ?? 'App';
  }
}
