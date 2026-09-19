import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './ApiError.js';

const ACCESS_TYP = 'access';
const REFRESH_TYP = 'refresh';
const ISSUER = 'ecom-api';
const AUDIENCE = 'ecom-client';

type AccessPayload = {
  sub: string;
  typ: typeof ACCESS_TYP;
};

type RefreshPayload = {
  sub: string;
  typ: typeof REFRESH_TYP;
};

function asExpiresIn(value: string): jwt.SignOptions['expiresIn'] {
  return value as jwt.SignOptions['expiresIn'];
}

export function signAccessToken(userId: string): string {
  const payload: AccessPayload = { sub: userId, typ: ACCESS_TYP };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: asExpiresIn(env.JWT_ACCESS_EXPIRES_IN),
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

export function signRefreshToken(userId: string): string {
  const payload: RefreshPayload = { sub: userId, typ: REFRESH_TYP };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: asExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    issuer: ISSUER,
    audience: AUDIENCE,
  });
}

function assertPayload(value: string | jwt.JwtPayload, typ: string): jwt.JwtPayload {
  if (typeof value === 'string' || value.typ !== typ || typeof value.sub !== 'string') {
    throw new AppError(401, 'Invalid token', 'INVALID_TOKEN');
  }

  return value;
}

export function verifyAccessToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return assertPayload(payload, ACCESS_TYP).sub as string;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(401, 'Invalid or expired access token', 'INVALID_TOKEN');
  }
}

export function verifyRefreshToken(token: string): string {
  try {
    const payload = jwt.verify(token, env.JWT_REFRESH_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    return assertPayload(payload, REFRESH_TYP).sub as string;
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    throw new AppError(401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }
}
