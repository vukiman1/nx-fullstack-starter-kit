import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthIdentityEntity } from '../../entities/auth-identity.entity';
import { UserEntity } from '../../../user/entities/user.entity';
import { UserService } from '../../../user/user.service';
import { NormalizedIdentity } from './normalized-identity';

const POSTGRES_UNIQUE_VIOLATION = '23505';

@Injectable()
export class SocialAuthService {
  constructor(
    @InjectRepository(AuthIdentityEntity)
    private readonly identityRepo: Repository<AuthIdentityEntity>,
    private readonly userService: UserService,
  ) {}

  async findOrLinkIdentity(identity: NormalizedIdentity): Promise<UserEntity> {
    const linked = await this.findIdentityUser(identity);
    if (linked) {
      return linked;
    }

    try {
      const userByEmail = await this.userService.getOne({ email: identity.email });
      return userByEmail
        ? await this.linkToExistingUser(userByEmail, identity)
        : await this.createUserWithIdentity(identity);
    } catch (error) {
      // A concurrent first login raced us to create the same identity or user.
      if (isUniqueViolation(error)) {
        const raced = await this.findIdentityUser(identity);
        if (raced) {
          return raced;
        }
      }
      throw error;
    }
  }

  private async findIdentityUser(identity: NormalizedIdentity): Promise<UserEntity | null> {
    const existing = await this.identityRepo.findOne({
      where: { provider: identity.provider, providerAccountId: identity.providerAccountId },
    });
    return existing ? this.userService.getOneOrFail({ id: existing.userId }) : null;
  }

  private async linkToExistingUser(
    user: UserEntity,
    identity: NormalizedIdentity,
  ): Promise<UserEntity> {
    if (identity.emailVerified && !user.isEmailVerified) {
      await this.userService.update(user, { isEmailVerified: true });
    }
    await this.saveIdentity(user.id, identity);
    return user;
  }

  private async createUserWithIdentity(identity: NormalizedIdentity): Promise<UserEntity> {
    const user = await this.userService.create({
      email: identity.email,
      isEmailVerified: identity.emailVerified,
      avatar: identity.avatar,
      displayName: identity.displayName ?? null,
    });
    await this.saveIdentity(user.id, identity);
    return user;
  }

  private saveIdentity(userId: string, identity: NormalizedIdentity): Promise<AuthIdentityEntity> {
    return this.identityRepo.save(
      this.identityRepo.create({
        userId,
        provider: identity.provider,
        providerAccountId: identity.providerAccountId,
        email: identity.email,
        emailVerified: identity.emailVerified,
        displayName: identity.displayName ?? null,
        avatar: identity.avatar ?? null,
      }),
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: string; driverError?: { code?: string } };
  return (
    candidate.code === POSTGRES_UNIQUE_VIOLATION ||
    candidate.driverError?.code === POSTGRES_UNIQUE_VIOLATION
  );
}
