import Redis from 'ioredis';
import { logger } from './logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('error', (error) => {
  logger.error({ error }, 'Redis connection error');
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redis.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error({ key, error }, 'Error reading from Redis cache');
    return null; // Return null so we can fallback to DB/API gracefully
  }
};

export const setCache = async (key: string, value: any, ttlSeconds: number = 21600): Promise<void> => {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.error({ key, error }, 'Error writing to Redis cache');
  }
};
