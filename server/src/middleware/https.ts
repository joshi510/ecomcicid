import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

export function enforceHttps(req: Request, res: Response, next: NextFunction) {
  if (env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const forwarded = req.headers['x-forwarded-proto'];
  const proto = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  if (proto === 'https' || req.secure) {
    next();
    return;
  }

  const host = req.headers.host ?? '';
  res.redirect(301, `https://${host}${req.originalUrl}`);
}
