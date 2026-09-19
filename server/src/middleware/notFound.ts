import type { Request, Response } from 'express';
import { sendError } from '../utils/response.js';

export function notFoundHandler(req: Request, res: Response) {
  sendError(res, 404, `Cannot ${req.method} ${req.originalUrl}`, {
    code: 'NOT_FOUND',
  });
}
