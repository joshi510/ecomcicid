import { pinoHttp } from 'pino-http';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

export const requestLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => env.NODE_ENV === 'test' || req.url === '/api/health',
  },
});
