import type { Request, Response } from 'express';
import { issueCsrfToken } from '../middleware/csrf.js';
import { sendSuccess } from '../utils/response.js';

export function csrfToken(req: Request, res: Response) {
  const token = issueCsrfToken(req, res);
  sendSuccess(res, { csrfToken: token }, 'CSRF token issued');
}
