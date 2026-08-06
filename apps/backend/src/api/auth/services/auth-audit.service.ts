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
  LOGIN_TWO_FACTOR_REQUIRED = 'auth.login.two_factor_required',
  LOGIN_TWO_FACTOR_FAILED = 'auth.login.two_factor_failed',
  TWO_FACTOR_ENABLED = 'auth.two_factor.enabled',
  TWO_FACTOR_DISABLED = 'auth.two_factor.disabled',
  TWO_FACTOR_RECOVERY_REQUESTED = 'auth.two_factor.recovery_requested',
  TWO_FACTOR_RECOVERED = 'auth.two_factor.recovered',
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
