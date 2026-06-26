import { ExecutionContext } from '@nestjs/common';
import { CaptchaService } from '../services/captcha.service';
import { CaptchaGuard } from './captcha.guard';

function contextWithBody(body: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ body }) }),
  } as unknown as ExecutionContext;
}

describe('CaptchaGuard', () => {
  it('forwards the body captcha token to the service and allows the request', async () => {
    const captchaService = {
      verify: jest.fn().mockResolvedValue(undefined),
    } as unknown as CaptchaService;
    const guard = new CaptchaGuard(captchaService);

    const allowed = await guard.canActivate(contextWithBody({ captchaToken: 'abc' }));

    expect(captchaService.verify).toHaveBeenCalledWith('abc');
    expect(allowed).toBe(true);
  });

  it('propagates a verification failure', async () => {
    const captchaService = {
      verify: jest.fn().mockRejectedValue(new Error('captcha failed')),
    } as unknown as CaptchaService;
    const guard = new CaptchaGuard(captchaService);

    await expect(guard.canActivate(contextWithBody({}))).rejects.toThrow('captcha failed');
  });
});
