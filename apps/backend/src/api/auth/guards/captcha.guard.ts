import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { CaptchaService } from '../services/captcha.service';

@Injectable()
export class CaptchaGuard implements CanActivate {
  constructor(private readonly captchaService: CaptchaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const captchaToken = (request.body as { captchaToken?: string })?.captchaToken;
    await this.captchaService.verify(captchaToken);
    return true;
  }
}
