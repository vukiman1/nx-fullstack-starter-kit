import { CookieOptions, Response } from 'express';

export const CookieName = {
  ACCESS_TOKEN: 'access_token',
  SESSION: 'sub',
} as const;

export type CookieName = (typeof CookieName)[keyof typeof CookieName];

const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const COOKIE_DEFAULTS: Record<CookieName, CookieOptions> = {
  [CookieName.ACCESS_TOKEN]: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
  },
  [CookieName.SESSION]: {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_PRODUCTION,
    path: '/',
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
  response.clearCookie(name, COOKIE_DEFAULTS[name]);
}
