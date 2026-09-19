import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';
import { sendError } from '../utils/response.js';

function tooManyRequests(_req: unknown, res: Parameters<typeof sendError>[0]) {
  sendError(res, 429, 'Too many requests', { code: 'RATE_LIMITED' });
}

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: (req) => env.NODE_ENV === 'test' || req.path === '/health',
  handler: tooManyRequests,
});

function authAttemptKey(req: { ip?: string; body?: { email?: unknown } }) {
  const email =
    typeof req.body?.email === 'string' ? req.body.email.toLowerCase().trim() : 'unknown';
  return `${req.ip ?? 'unknown'}:${email}`;
}

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authAttemptKey,
  skip: () => env.NODE_ENV === 'test',
  handler: tooManyRequests,
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: authAttemptKey,
  skip: () => env.NODE_ENV === 'test',
  handler: tooManyRequests,
});
