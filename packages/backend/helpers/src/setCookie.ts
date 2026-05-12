import { TokenExpires } from '@org/backend-constants';
import { CookieOptions, Response } from 'express';

export const CookieName = {
  ACCESS_TOKEN: 'access_token',
  SESSION: 'sub',
} as const;

export type CookieName = (typeof CookieName)[keyof typeof CookieName];

const COOKIE_DEFAULTS: Record<CookieName, CookieOptions> = {
  [CookieName.ACCESS_TOKEN]: {
    maxAge: TokenExpires.redisAccessToken,
    httpOnly: true,
    sameSite: 'lax',
  },
  [CookieName.SESSION]: {
    maxAge: TokenExpires.redisRefreshToken,
    httpOnly: true,
  },
};

export function setCookie(
  response: Response,
  name: CookieName,
  value: string,
  overrides?: CookieOptions,
) {
  response.cookie(name, value, { ...COOKIE_DEFAULTS[name], ...overrides });
}

export function clearCookie(response: Response, name: CookieName) {
  response.clearCookie(name);
}
