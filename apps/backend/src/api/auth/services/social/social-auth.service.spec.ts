import { AuthProvider } from '@org/backend-enum';
import { SocialAuthService } from './social-auth.service';
import { NormalizedIdentity } from './normalized-identity';

const identity: NormalizedIdentity = {
  provider: AuthProvider.GOOGLE,
  providerAccountId: 'sub-1',
  email: 'jane@example.com',
  emailVerified: true,
  displayName: 'Jane',
  avatar: 'https://pic',
};

describe('SocialAuthService.findOrLinkIdentity', () => {
  let identityRepo: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let userService: {
    getOne: jest.Mock;
    getOneOrFail: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let service: SocialAuthService;

  beforeEach(() => {
    identityRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((value) => value),
      save: jest.fn((value) => Promise.resolve({ id: 'identity-1', ...value })),
    };
    userService = {
      getOne: jest.fn().mockResolvedValue(null),
      getOneOrFail: jest.fn(),
      create: jest.fn((value) => Promise.resolve({ id: 'user-new', ...value })),
      update: jest.fn((user, patch) => Promise.resolve({ ...user, ...patch })),
    };
    service = new SocialAuthService(identityRepo as never, userService as never);
  });

  it('returns the linked user when the identity already exists', async () => {
    identityRepo.findOne.mockResolvedValue({ userId: 'user-9' });
    userService.getOneOrFail.mockResolvedValue({ id: 'user-9', email: 'jane@example.com' });

    const user = await service.findOrLinkIdentity(identity);

    expect(user.id).toBe('user-9');
    expect(userService.create).not.toHaveBeenCalled();
    expect(identityRepo.save).not.toHaveBeenCalled();
  });

  it('links to an existing user by verified email and upgrades verification', async () => {
    userService.getOne.mockResolvedValue({
      id: 'user-5',
      email: 'jane@example.com',
      isEmailVerified: false,
    });

    const user = await service.findOrLinkIdentity(identity);

    expect(user.id).toBe('user-5');
    expect(userService.update).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-5' }), {
      isEmailVerified: true,
    });
    expect(identityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-5',
        provider: AuthProvider.GOOGLE,
        providerAccountId: 'sub-1',
      }),
    );
    expect(userService.create).not.toHaveBeenCalled();
  });

  it('creates a new verified user when no account exists', async () => {
    const user = await service.findOrLinkIdentity(identity);

    expect(userService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        isEmailVerified: true,
        avatar: 'https://pic',
      }),
    );
    expect(identityRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-new', provider: AuthProvider.GOOGLE }),
    );
    expect(user.id).toBe('user-new');
  });

  it('recovers from a concurrent create by returning the raced identity user', async () => {
    const uniqueViolation = Object.assign(new Error('duplicate key'), { code: '23505' });
    userService.getOne.mockResolvedValue({
      id: 'user-5',
      email: 'jane@example.com',
      isEmailVerified: true,
    });
    identityRepo.save.mockRejectedValueOnce(uniqueViolation);
    identityRepo.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ userId: 'user-raced' });
    userService.getOneOrFail.mockResolvedValue({ id: 'user-raced', email: 'jane@example.com' });

    const user = await service.findOrLinkIdentity(identity);

    expect(user.id).toBe('user-raced');
  });
});
