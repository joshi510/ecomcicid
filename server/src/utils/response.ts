import type { Response } from 'express';

export type ApiSuccess<T> = {
  success: true;
  data: T;
  message: string;
  error: null;
};

export type ApiFailure = {
  success: false;
  data: unknown;
  message: string;
  error: {
    code: string;
    details?: unknown;
  };
};

export function sendSuccess<T>(res: Response, data: T, message = 'OK', statusCode = 200): Response {
  const body: ApiSuccess<T> = {
    success: true,
    data,
    message,
    error: null,
  };
  return res.status(statusCode).json(body);
}

export function sendError(
  res: Response,
  statusCode: number,
  message: string,
  error: { code: string; details?: unknown },
  data: unknown = null,
): Response {
  const body: ApiFailure = {
    success: false,
    data,
    message,
    error,
  };
  return res.status(statusCode).json(body);
}
