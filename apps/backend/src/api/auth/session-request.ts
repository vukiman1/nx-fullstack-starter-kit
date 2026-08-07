import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

export function requireSessionJti(request: Request): string {
  const jti = request.sessionJti;
  if (!jti) {
    throw new UnauthorizedException();
  }
  return jti;
}
