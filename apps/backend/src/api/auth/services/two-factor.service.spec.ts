import { BadRequestException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ConfigService } from '@nestjs/config';
import { CryptoService } from '@org/backend-crypto';
import { Repository } from 'typeorm';
import { UserTotpEntity } from '../entities/user-totp.entity';
import { UserRecoveryCodeEntity } from '../entities/user-recovery-code.entity';
import { TotpService } from './totp.service';
import { TwoFactorService } from './two-factor.service';

const USER_ID = 'user-1';

function buildTotpService(): TotpService {
  const config = {
    get: (key: string) => (key === 'crypto.secretKey' ? 'test-secret-key' : 'My Workspace'),
  } as unknown as ConfigService;
  return new TotpService(new CryptoService(config), config);
}

describe('TwoFactorService', () => {
  let totpRepo: {
    exists: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    upsert: jest.Mock;
    create: jest.Mock;
  };
  let recoveryRepo: {
    find: jest.Mock;
    save: jest.Mock;
    delete: jest.Mock;
    create: jest.Mock;
    count: jest.Mock;
  };
  let totpService: TotpService;
  let service: TwoFactorService;

  beforeEach(() => {
    totpService = buildTotpService();
    totpRepo = {
      exists: jest.fn().mockResolvedValue(false),
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(async (entity) => entity),
      delete: jest.fn().mockResolvedValue(undefined),
      upsert: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((data) => ({ ...data })),
    };
    recoveryRepo = {
      find: jest.fn().mockResolvedValue([]),
      save: jest.fn(async (entities) => entities),
      delete: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((data) => ({ ...data })),
      count: jest.fn().mockResolvedValue(0),
    };
    service = new TwoFactorService(
      totpRepo as unknown as Repository<UserTotpEntity>,
      recoveryRepo as unknown as Repository<UserRecoveryCodeEntity>,
      totpService,
    );
  });

  describe('enrolment', () => {
    it('hands back the same QR code when setup is reopened', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret, confirmedAt: null });

      const { otpauthUri } = await service.startEnrolment(USER_ID, 'a@b.c');

      // The code already in the user's authenticator app must keep working.
      expect(totpRepo.upsert).not.toHaveBeenCalled();
      expect(new URL(otpauthUri).searchParams.get('secret')).toBeTruthy();
    });

    it('refuses to start again once two-factor is already on', async () => {
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret: 'x', confirmedAt: new Date() });
      totpRepo.exists.mockResolvedValue(true);

      await expect(service.startEnrolment(USER_ID, 'a@b.c')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(totpRepo.save).not.toHaveBeenCalled();
    });

    it('replaces an abandoned setup so the user is not stuck with it', async () => {
      await service.startEnrolment(USER_ID, 'a@b.c');

      expect(totpRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ userId: USER_ID, confirmedAt: null }),
        { conflictPaths: ['userId'] },
      );
    });

    it('survives two setup requests racing each other', async () => {
      // React StrictMode fires the effect twice in development, so this is the common case, not a
      // corner one. A delete-then-insert pair would collide on the unique index here.
      await Promise.all([
        service.startEnrolment(USER_ID, 'a@b.c'),
        service.startEnrolment(USER_ID, 'a@b.c'),
      ]);

      expect(totpRepo.upsert).toHaveBeenCalledTimes(2);
      expect(totpRepo.delete).not.toHaveBeenCalled();
    });

    it('stores the secret encrypted, never in the clear', async () => {
      const { otpauthUri } = await service.startEnrolment(USER_ID, 'a@b.c');
      const plainSecret = new URL(otpauthUri).searchParams.get('secret') as string;

      const [row] = totpRepo.upsert.mock.calls[0];
      expect(row.secret).not.toContain(plainSecret);
    });

    it('stays off until a correct code proves the app holds the secret', async () => {
      const enrolment = { userId: USER_ID, secret: '', confirmedAt: null } as UserTotpEntity;
      enrolment.secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue(enrolment);

      await expect(service.confirmEnrolment(USER_ID, '000000')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(enrolment.confirmedAt).toBeNull();
    });

    it('turns on and hands back recovery codes once the code checks out', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      const enrolment = { userId: USER_ID, secret, confirmedAt: null } as UserTotpEntity;
      totpRepo.findOne.mockResolvedValue(enrolment);

      const { recoveryCodes } = await service.confirmEnrolment(
        USER_ID,
        totpService.generateFor(secret),
      );

      expect(enrolment.confirmedAt).toBeInstanceOf(Date);
      expect(recoveryCodes).toHaveLength(10);
      expect(new Set(recoveryCodes).size).toBe(10);
    });

    it('keeps only hashes of the recovery codes it just showed', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret, confirmedAt: null });

      const { recoveryCodes } = await service.confirmEnrolment(
        USER_ID,
        totpService.generateFor(secret),
      );

      const stored = recoveryRepo.save.mock.calls[0][0] as UserRecoveryCodeEntity[];
      const hashes = stored.map((row) => row.codeHash);
      expect(hashes).not.toEqual(expect.arrayContaining(recoveryCodes));
      await expect(argon2.verify(hashes[0], recoveryCodes[0])).resolves.toBe(true);
    });
  });

  describe('consuming a code at sign-in', () => {
    it('accepts a live code from the authenticator app', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret, confirmedAt: new Date() });

      await expect(service.consumeCode(USER_ID, totpService.generateFor(secret))).resolves.toBe(
        true,
      );
    });

    it('falls back to a recovery code and spends it', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret, confirmedAt: new Date() });
      const row = { codeHash: await argon2.hash('abcdef1234'), usedAt: null };
      recoveryRepo.find.mockResolvedValue([row]);

      await expect(service.consumeCode(USER_ID, 'abcdef1234')).resolves.toBe(true);
      expect(row.usedAt).toBeInstanceOf(Date);
    });

    it('only ever looks at recovery codes that are still unused', async () => {
      const secret = totpService.createEnrolment('a@b.c').encryptedSecret;
      totpRepo.findOne.mockResolvedValue({ userId: USER_ID, secret, confirmedAt: new Date() });

      await service.consumeCode(USER_ID, 'whatever');

      expect(recoveryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: USER_ID }) }),
      );
      const { where } = recoveryRepo.find.mock.calls[0][0];
      expect(where.usedAt).toBeDefined();
    });

    it('rejects everything when two-factor was never confirmed', async () => {
      totpRepo.findOne.mockResolvedValue(null);

      await expect(service.consumeCode(USER_ID, '123456')).resolves.toBe(false);
      expect(recoveryRepo.find).not.toHaveBeenCalled();
    });
  });

  it('removes both the secret and the recovery codes when switched off', async () => {
    await service.disable(USER_ID);

    expect(totpRepo.delete).toHaveBeenCalledWith({ userId: USER_ID });
    expect(recoveryRepo.delete).toHaveBeenCalledWith({ userId: USER_ID });
  });

  it('will not reissue recovery codes for someone who has not enabled two-factor', async () => {
    totpRepo.exists.mockResolvedValue(false);

    await expect(service.regenerateRecoveryCodes(USER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
