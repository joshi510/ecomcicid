import { Prisma } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import Stripe from 'stripe';
import { ZodError } from 'zod';
import { env } from '../config/env.js';
import { AppError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { sendError } from '../utils/response.js';

function mapError(err: unknown): {
  statusCode: number;
  message: string;
  code: string;
  details?: unknown;
} {
  if (err instanceof AppError) {
    return {
      statusCode: err.statusCode,
      message: err.message,
      code: err.code,
      details: err.details,
    };
  }

  if (err instanceof ZodError) {
    return {
      statusCode: 400,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.issues,
    };
  }

  if (err instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 503,
      message: 'Database is unavailable. Check DATABASE_URL and that Postgres is running.',
      code: 'DB_UNAVAILABLE',
    };
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return {
        statusCode: 409,
        message: 'A record with that value already exists',
        code: 'CONFLICT',
        details: err.meta,
      };
    }
    if (err.code === 'P2025') {
      return {
        statusCode: 404,
        message: 'Record not found',
        code: 'NOT_FOUND',
      };
    }
    if (err.code === 'P2003') {
      return {
        statusCode: 400,
        message: 'Invalid related record',
        code: 'INVALID_RELATION',
      };
    }
    return {
      statusCode: 400,
      message: 'Database request failed',
      code: err.code,
    };
  }

  if (err instanceof Stripe.errors.StripeError) {
    if (err instanceof Stripe.errors.StripeAuthenticationError || err.code === 'api_key_expired') {
      return {
        statusCode: 503,
        message:
          'Stripe rejected the API key. Add test keys from https://dashboard.stripe.com/test/apikeys to server/.env, then restart the API.',
        code: 'STRIPE_NOT_CONFIGURED',
      };
    }
    return {
      statusCode:
        err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 402,
      message: err.message,
      code: err.code ?? 'STRIPE_ERROR',
    };
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return {
        statusCode: 413,
        message: 'Image exceeds the 5MB size limit',
        code: 'FILE_TOO_LARGE',
      };
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return {
        statusCode: 400,
        message: 'Too many images (maximum 8)',
        code: 'TOO_MANY_FILES',
      };
    }
    return {
      statusCode: 400,
      message: 'File upload failed',
      code: err.code,
    };
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return {
      statusCode: 400,
      message: 'Invalid JSON body',
      code: 'INVALID_JSON',
    };
  }

  return {
    statusCode: 500,
    message: 'Internal server error',
    code: 'INTERNAL_ERROR',
  };
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const mapped = mapError(err);

  logger.error(
    {
      err,
      method: req.method,
      url: req.originalUrl,
      statusCode: mapped.statusCode,
      code: mapped.code,
    },
    mapped.message,
  );

  const details = env.NODE_ENV === 'production' ? undefined : mapped.details;

  sendError(res, mapped.statusCode, mapped.message, {
    code: mapped.code,
    ...(details !== undefined ? { details } : {}),
  });
}
