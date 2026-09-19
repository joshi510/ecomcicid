import { randomBytes } from 'node:crypto';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from '../utils/ApiError.js';
import {
  CART_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
  cookieSecurity,
  readCartHeader,
} from '../utils/cookies.js';
import { isAllowedOrigin } from '../utils/origins.js';

export const CSRF_COOKIE_NAME = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function csrfCookieOptions(): CookieOptions {
  return {
    httpOnly: false,
    ...cookieSecurity(),
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function issueCsrfToken(req: Request, res: Response) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (typeof existing === 'string' && existing.length >= 32) {
    return existing;
  }
  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  return token;
}

export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (SAFE_METHODS.has(req.method)) {
    issueCsrfToken(req, res);
    next();
    return;
  }

  if (req.originalUrl.startsWith('/api/payments/webhook')) {
    next();
    return;
  }

  if (!isAllowedOrigin(req.headers.origin)) {
    next(new AppError(403, 'Origin is not allowed', 'CSRF_ORIGIN'));
    return;
  }

  if (env.NODE_ENV === 'test') {
    next();
    return;
  }

  const usesCookie = Boolean(
    req.cookies?.[REFRESH_COOKIE_NAME] ||
      req.cookies?.[CART_COOKIE_NAME] ||
      readCartHeader(req),
  );
  if (!usesCookie) {
    next();
    return;
  }

  const header = req.headers['x-csrf-token'];
  const cookie = req.cookies?.[CSRF_COOKIE_NAME];
  const token = Array.isArray(header) ? header[0] : header;

  if (!cookie || !token || cookie !== token) {
    next(new AppError(403, 'CSRF token missing or invalid', 'CSRF_INVALID'));
    return;
  }

  next();
}
