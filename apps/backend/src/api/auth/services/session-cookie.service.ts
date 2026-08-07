import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { CryptoService } from '@org/backend-crypto';
import { clearCookie, CookieName, setCookie } from '@org/backend-helpers';
import { SessionPersistence } from '../enums/session-persistence.enum';

export interface SessionCookiePayload {
  id: string;
  jti: string;
  persistence: SessionPersistence;
}

interface IssuedTokens {
  accessToken: string;
  accessTokenTtlMs: number;
  refreshTokenTtlMs: number;
}

@Injectable()
export class SessionCookieService {
  constructor(private readonly cryptoService: CryptoService) {}

  issue(response: Response, payload: SessionCookiePayload, tokens: IssuedTokens): void {
    setCookie(response, CookieName.SESSION, this.encode(payload), {
      maxAge: tokens.refreshTokenTtlMs,
    });
    setCookie(response, CookieName.ACCESS_TOKEN, tokens.accessToken, {
      maxAge: tokens.accessTokenTtlMs,
    });
  }

  clear(response: Response): void {
    clearCookie(response, CookieName.ACCESS_TOKEN);
    clearCookie(response, CookieName.SESSION);
  }

  read(request: Request): SessionCookiePayload {
    const raw = request.cookies?.[CookieName.SESSION];
    const payload = raw ? this.decode(raw) : null;
    if (!payload) {
      throw new UnauthorizedException();
    }
    return payload;
  }

  private encode(payload: SessionCookiePayload): string {
    return this.cryptoService.encryptData(JSON.stringify(payload));
  }

  private decode(raw: string): SessionCookiePayload | null {
    try {
      const parsed: unknown = JSON.parse(this.cryptoService.decryptData(raw));
      if (typeof parsed !== 'object' || parsed === null) {
        return null;
      }
      const record = parsed as Record<string, unknown>;
      if (typeof record.id !== 'string' || typeof record.jti !== 'string') {
        return null;
      }
      return { id: record.id, jti: record.jti, persistence: coercePersistence(record) };
    } catch {
      return null;
    }
  }
}

function coercePersistence(record: Record<string, unknown>): SessionPersistence {
  const value = record.persistence;
  if (
    value === SessionPersistence.STANDARD ||
    value === SessionPersistence.REMEMBER ||
    value === SessionPersistence.OAUTH
  ) {
    return value;
  }
  // Legacy cookies stored `remember: boolean`; map it onto the persistence policy.
  return record.remember === true ? SessionPersistence.REMEMBER : SessionPersistence.STANDARD;
}
