import type { Request, Response } from 'express';
import { getHealthSnapshot } from '../services/health.service.js';
import { sendError, sendSuccess } from '../utils/response.js';

export async function getHealth(_req: Request, res: Response) {
  const data = await getHealthSnapshot();

  if (data.database === 'down') {
    sendError(res, 503, 'Service degraded', { code: 'DB_UNAVAILABLE' }, data);
    return;
  }

  sendSuccess(res, data, 'Service healthy');
}
