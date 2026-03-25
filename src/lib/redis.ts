import Redis from 'ioredis';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export const getRedis = () => {
  if (typeof window !== "undefined") return null;
  if (redisInstance) return redisInstance;

  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  
  // Skip connection during build phase if desired, or just handle it
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  redisInstance = new Redis(redisUrl, {
    maxRetriesPerRequest: 1, // Minimize wait during build/errors
    retryStrategy(times) {
      if (times > 3) return null; // Stop retrying after 3 times
      return Math.min(times * 200, 1000);
    },
  });

  redisInstance.on("error", (error) => {
    logger.error({ error }, "Redis connection error");
  });

  return redisInstance;
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const client = getRedis();
    if (!client) return null;
    const data = await client.get(key);
    if (!data) return null;
    return JSON.parse(data) as T;
  } catch (error) {
    logger.error({ key, error }, 'Error reading from Redis cache');
    return null;
  }
};

export const setCache = async (key: string, value: unknown, ttlSeconds: number = 21600): Promise<void> => {
  try {
    const client = getRedis();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (error) {
    logger.error({ key, error }, 'Error writing to Redis cache');
  }
};
