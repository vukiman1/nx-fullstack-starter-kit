import { UserEntity } from './user.entity';

describe('UserEntity password hashing', () => {
  it('hashes a freshly assigned plaintext password', async () => {
    const user = new UserEntity();
    user.password = 'plaintext-secret';
    await user.hashPasswordIfPlaintext();
    expect(user.password).toMatch(/^\$argon2/);
  });

  it('leaves a null password untouched (OAuth-only user)', async () => {
    const user = new UserEntity();
    user.password = null;
    await user.hashPasswordIfPlaintext();
    expect(user.password).toBeNull();
  });

  it('does not re-hash an already hashed password', async () => {
    const user = new UserEntity();
    user.password = 'plaintext-secret';
    await user.hashPasswordIfPlaintext();
    const hashed = user.password;
    await user.hashPasswordIfPlaintext();
    expect(user.password).toBe(hashed);
  });
});
