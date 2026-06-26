import { validate } from 'class-validator';
import { Match } from './match.validator';

class Sample {
  password!: string;

  @Match('password')
  confirmPassword!: string;
}

async function validateSample(password: string, confirmPassword: string) {
  const sample = new Sample();
  sample.password = password;
  sample.confirmPassword = confirmPassword;
  return validate(sample);
}

describe('Match validator', () => {
  it('passes when the two fields are equal', async () => {
    expect(await validateSample('secret', 'secret')).toHaveLength(0);
  });

  it('fails on the decorated field when the values differ', async () => {
    const errors = await validateSample('secret', 'different');
    expect(errors).toHaveLength(1);
    expect(errors[0].property).toBe('confirmPassword');
  });
});
