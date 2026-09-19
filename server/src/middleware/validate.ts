import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../utils/ApiError.js';
import { setValidatedParams, setValidatedQuery } from '../utils/request.js';

type RequestSchema = ZodType<{
  body?: unknown;
  query?: unknown;
  params?: unknown;
}>;

export function validate(schema: RequestSchema): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!parsed.success) {
      next(new AppError(400, 'Validation failed', 'VALIDATION_ERROR', parsed.error.issues));
      return;
    }

    if (parsed.data.body !== undefined) {
      req.body = parsed.data.body;
    }
    if (parsed.data.query !== undefined) {
      setValidatedQuery(req, parsed.data.query);
    }
    if (parsed.data.params !== undefined) {
      setValidatedParams(req, parsed.data.params as Record<string, string>);
    }

    next();
  };
}
