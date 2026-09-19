import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

type Entry = { value: string; expiresAt: number };

const memory = new Map<string, Entry>();
const DEFAULT_TTL = 60;

let redis: { get(key: string): Promise<string | null>; setex(key: string, ttl: number, value: string): Promise<unknown>; keys(pattern: string): Promise<string[]>; del(...keys: string[]): Promise<unknown> } | null =
  null;
let redisReady: Promise<void> | null = null;

async function connectRedis() {
  if (!env.REDIS_URL || redisReady) {
    return redisReady;
  }
  redisReady = import('ioredis')
    .then(({ Redis }) => {
      const client = new Redis(env.REDIS_URL!, { maxRetriesPerRequest: 2, lazyConnect: true });
      return client.connect().then(() => {
        redis = client;
        logger.info('Product cache connected to Redis');
      });
    })
    .catch((err: unknown) => {
      logger.warn({ err }, 'Redis unavailable — using in-memory product cache');
      redis = null;
    });
  return redisReady;
}

void connectRedis();

function memoryGet(key: string) {
  const entry = memory.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheGet(key: string) {
  await redisReady;
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      return memoryGet(key);
    }
  }
  return memoryGet(key);
}

export async function cacheSet(key: string, value: string, ttlSeconds = DEFAULT_TTL) {
  await redisReady;
  if (redis) {
    try {
      await redis.setex(key, ttlSeconds, value);
      return;
    } catch {
      /* fall through */
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDeletePrefix(prefix: string) {
  await redisReady;
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      /* fall through */
    }
  }
  for (const key of memory.keys()) {
    if (key.startsWith(prefix)) {
      memory.delete(key);
    }
  }
}
