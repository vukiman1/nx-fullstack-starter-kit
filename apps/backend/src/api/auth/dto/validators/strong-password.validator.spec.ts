import { validate } from 'class-validator';
import { IsStrongPassword } from './strong-password.validator';

class Sample {
  @IsStrongPassword()
  password!: string;
}

async function validatePassword(password: string) {
  const sample = new Sample();
  sample.password = password;
  return validate(sample);
}

describe('IsStrongPassword', () => {
  it('accepts a password with 8+ chars including a letter and a number', async () => {
    expect(await validatePassword('passw0rd')).toHaveLength(0);
  });

  it('rejects a password shorter than 8 chars', async () => {
    expect((await validatePassword('pass1')).length).toBeGreaterThan(0);
  });

  it('rejects a password without a number', async () => {
    expect((await validatePassword('passwordonly')).length).toBeGreaterThan(0);
  });

  it('rejects a password without a letter', async () => {
    expect((await validatePassword('12345678')).length).toBeGreaterThan(0);
  });
});
