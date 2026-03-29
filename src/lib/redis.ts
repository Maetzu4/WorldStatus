import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const isBuildPhase = 
  process.env.npm_lifecycle_event === 'build' || 
  process.env.NODE_ENV?.includes('build');

let redisInstance: Redis | null = null;

if (!isBuildPhase) {
  redisInstance = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisInstance.on('error', (error) => {
    logger.error({ error }, 'Redis connection error');
  });

  redisInstance.on('connect', () => {
    logger.info('Connected to Redis');
  });
}

// Ensure backwards compatibility for current imports
export const redis = redisInstance as Redis;

export const getCache = async <T>(key: string): Promise<T | null> => {
  if (!redisInstance) return null;
  try {
    const data = await redisInstance.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error({ key, error }, 'Error reading from Redis cache');
    return null; // Return null so we can fallback to DB/API gracefully
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds: number = 21600): Promise<void> => {
  if (!redisInstance) return;
  try {
    await redisInstance.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.error({ key, error }, 'Error writing to Redis cache');
  }
};
