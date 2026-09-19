import { prisma } from '../prisma/client.js';
import { logger } from '../utils/logger.js';

export type HealthSnapshot = {
  status: 'ok' | 'degraded';
  uptime: number;
  timestamp: string;
  database: 'up' | 'down';
  latencyMs: number;
};

export async function getHealthSnapshot(): Promise<HealthSnapshot> {
  const started = Date.now();
  let database: HealthSnapshot['database'] = 'down';

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = 'up';
  } catch (err) {
    logger.error({ err }, 'Health check database ping failed');
  }

  return {
    status: database === 'up' ? 'ok' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database,
    latencyMs: Date.now() - started,
  };
}
