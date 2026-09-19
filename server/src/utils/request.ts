import type { Request } from 'express';
import { AppError } from './ApiError.js';

const validatedQuery = new WeakMap<Request, unknown>();
const validatedParams = new WeakMap<Request, Record<string, string>>();

export function setValidatedQuery(req: Request, query: unknown) {
  validatedQuery.set(req, query);
}

export function setValidatedParams(req: Request, params: Record<string, string>) {
  validatedParams.set(req, params);
}

export function routeParam(req: Request, key: string): string {
  const value = validatedParams.get(req)?.[key] ?? req.params[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError(400, 'Invalid route parameter', 'VALIDATION_ERROR');
  }
  return value;
}

export function parsedQuery<T>(req: Request): T {
  const stored = validatedQuery.get(req);
  if (stored !== undefined) {
    return stored as T;
  }
  return req.query as unknown as T;
}
