import { Injectable, Logger } from '@nestjs/common';
import type { Request } from 'express';

export enum AuthEvent {
  LOGIN_SUCCEEDED = 'auth.login.succeeded',
  LOGIN_FAILED = 'auth.login.failed',
  LOGOUT = 'auth.logout',
  LOGOUT_ALL = 'auth.logout_all',
  TOKEN_REFRESHED = 'auth.token.refreshed',
  REGISTERED = 'auth.registered',
  EMAIL_VERIFIED = 'auth.email.verified',
  PASSWORD_RESET_REQUESTED = 'auth.password.reset_requested',
  PASSWORD_RESET = 'auth.password.reset',
  PASSWORD_CHANGED = 'auth.password.changed',
}

interface AuthEventContext {
  userId?: string;
  email?: string;
  jti?: string;
  request?: Request;
}

@Injectable()
export class AuthAuditService {
  private readonly logger = new Logger('AuthAudit');

  record(event: AuthEvent, context: AuthEventContext = {}): void {
    const { request, ...fields } = context;
    this.logger.log({
      event,
      ...fields,
      ip: request ? clientIp(request) : undefined,
      userAgent: request?.headers['user-agent'],
    });
  }
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return request.ip;
}
