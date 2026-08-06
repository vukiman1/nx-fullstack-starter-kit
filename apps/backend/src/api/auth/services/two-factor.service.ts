import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { UserTotpEntity } from '../entities/user-totp.entity';
import { UserRecoveryCodeEntity } from '../entities/user-recovery-code.entity';
import { TotpService } from './totp.service';

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 5;

export interface TotpEnrolmentStarted {
  readonly otpauthUri: string;
}

export interface TotpEnabled {
  /** Shown once — only hashes are kept, so these cannot be recovered afterwards. */
  readonly recoveryCodes: readonly string[];
}

@Injectable()
export class TwoFactorService {
  constructor(
    @InjectRepository(UserTotpEntity)
    private readonly totpRepo: Repository<UserTotpEntity>,
    @InjectRepository(UserRecoveryCodeEntity)
    private readonly recoveryRepo: Repository<UserRecoveryCodeEntity>,
    private readonly totpService: TotpService,
  ) {}

  async isEnabled(userId: string): Promise<boolean> {
    return this.totpRepo.exists({ where: { userId, confirmedAt: Not(IsNull()) } });
  }

  /**
   * Reuses an enrolment already in progress: minting a new secret would silently break the code
   * a user has just scanned. Upsert rather than delete-then-insert so two concurrent setup
   * requests cannot both find nothing and then collide on the unique index.
   */
  async startEnrolment(userId: string, accountLabel: string): Promise<TotpEnrolmentStarted> {
    const existing = await this.totpRepo.findOne({ where: { userId } });
    if (existing?.confirmedAt) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (existing) {
      return { otpauthUri: this.totpService.buildUri(existing.secret, accountLabel) };
    }

    const { encryptedSecret, otpauthUri } = this.totpService.createEnrolment(accountLabel);
    await this.totpRepo.upsert(
      { userId, secret: encryptedSecret, confirmedAt: null, lastUsedAt: null },
      { conflictPaths: ['userId'] },
    );

    return { otpauthUri };
  }

  async confirmEnrolment(userId: string, code: string): Promise<TotpEnabled> {
    const enrolment = await this.totpRepo.findOne({ where: { userId } });
    if (!enrolment) {
      throw new BadRequestException('Start two-factor setup first');
    }
    if (enrolment.confirmedAt) {
      throw new BadRequestException('Two-factor authentication is already enabled');
    }
    if (!this.totpService.verify(enrolment.secret, code)) {
      throw new BadRequestException('That code is not valid');
    }

    enrolment.confirmedAt = new Date();
    enrolment.lastUsedAt = new Date();
    await this.totpRepo.save(enrolment);

    return { recoveryCodes: await this.replaceRecoveryCodes(userId) };
  }

  async disable(userId: string): Promise<void> {
    await this.totpRepo.delete({ userId });
    await this.recoveryRepo.delete({ userId });
  }

  async regenerateRecoveryCodes(userId: string): Promise<TotpEnabled> {
    if (!(await this.isEnabled(userId))) {
      throw new BadRequestException('Two-factor authentication is not enabled');
    }
    return { recoveryCodes: await this.replaceRecoveryCodes(userId) };
  }

  /** Returns false rather than throwing so the caller can count failed attempts. */
  async consumeCode(userId: string, code: string): Promise<boolean> {
    const enrolment = await this.totpRepo.findOne({
      where: { userId, confirmedAt: Not(IsNull()) },
    });
    if (!enrolment) {
      return false;
    }

    if (this.totpService.verify(enrolment.secret, code)) {
      enrolment.lastUsedAt = new Date();
      await this.totpRepo.save(enrolment);
      return true;
    }

    return this.consumeRecoveryCode(userId, code);
  }

  async countUnusedRecoveryCodes(userId: string): Promise<number> {
    return this.recoveryRepo.count({ where: { userId, usedAt: IsNull() } });
  }

  // Hashes cannot be looked up by value, so each unused code is compared in turn.
  private async consumeRecoveryCode(userId: string, code: string): Promise<boolean> {
    const candidate = code.replace(/\s/g, '').toLowerCase();
    const unused = await this.recoveryRepo.find({ where: { userId, usedAt: IsNull() } });

    for (const stored of unused) {
      const matches = await argon2.verify(stored.codeHash, candidate).catch(() => false);
      if (matches) {
        stored.usedAt = new Date();
        await this.recoveryRepo.save(stored);
        return true;
      }
    }

    return false;
  }

  private async replaceRecoveryCodes(userId: string): Promise<string[]> {
    await this.recoveryRepo.delete({ userId });

    const codes = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
      randomBytes(RECOVERY_CODE_BYTES).toString('hex'),
    );
    await this.recoveryRepo.save(
      await Promise.all(
        codes.map(async (code) =>
          this.recoveryRepo.create({ userId, codeHash: await argon2.hash(code), usedAt: null }),
        ),
      ),
    );

    return codes;
  }
}
