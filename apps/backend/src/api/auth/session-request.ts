import { UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

/** The jti the JWT strategy attached to this request, or 401 if the route ran without one. */
export function requireSessionJti(request: Request): string {
  const jti = request.sessionJti;
  if (!jti) {
    throw new UnauthorizedException();
  }
  return jti;
}
