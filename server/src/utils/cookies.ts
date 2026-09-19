import type { CookieOptions, Request, Response } from 'express';
import { env } from '../config/env.js';
import { durationToMs } from './duration.js';

export const REFRESH_COOKIE_NAME = 'refresh_token';

export function cookieSecurity(): Pick<CookieOptions, 'secure' | 'sameSite'> {
  const sameSite = env.COOKIE_SAMESITE ?? (env.NODE_ENV === 'production' ? 'none' : 'lax');
  return {
    sameSite,
    secure: env.NODE_ENV === 'production' || sameSite === 'none',
  };
}

function refreshCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    ...cookieSecurity(),
    path: '/api/auth',
    maxAge: durationToMs(env.JWT_REFRESH_EXPIRES_IN),
  };
}

export function setRefreshCookie(res: Response, token: string) {
  res.cookie(REFRESH_COOKIE_NAME, token, refreshCookieOptions());
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...refreshCookieOptions(),
    maxAge: 0,
  });
}

export function readRefreshCookie(req: Request): string | undefined {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export const CART_COOKIE_NAME = 'cart_token';
export const CART_TOKEN_HEADER = 'x-cart-token';

function cartCookieOptions(path: string = '/'): CookieOptions {
  return {
    httpOnly: true,
    ...cookieSecurity(),
    path,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  };
}

export function setCartCookie(res: Response, token: string) {
  res.cookie(CART_COOKIE_NAME, token, cartCookieOptions());
}

export function clearCartCookie(res: Response) {
  res.clearCookie(CART_COOKIE_NAME, {
    ...cartCookieOptions(),
    maxAge: 0,
  });
  // Also drop leftovers from the previous path=/api cookie.
  res.clearCookie(CART_COOKIE_NAME, {
    ...cartCookieOptions('/api'),
    maxAge: 0,
  });
}

export function readCartCookie(req: Request): string | undefined {
  const token = req.cookies?.[CART_COOKIE_NAME];
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export function readCartHeader(req: Request): string | undefined {
  const raw = req.headers[CART_TOKEN_HEADER];
  const token = Array.isArray(raw) ? raw[0] : raw;
  return typeof token === 'string' && token.length > 0 ? token : undefined;
}

export function readCartToken(req: Request): string | undefined {
  return readCartCookie(req) ?? readCartHeader(req);
}
