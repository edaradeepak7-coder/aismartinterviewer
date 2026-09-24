/**
 * Redis client singleton for Next.js
 * Uses ioredis with graceful fallback when Redis is unavailable.
 */
import Redis from 'ioredis';

let redisClient: Redis | null = null;
let connectionFailed = false;

function createRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    return null;
  }

  try {
    const client = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
      lazyConnect: true,
      connectTimeout: 5000,
      commandTimeout: 3000,
    });

    client.on('error', (err) => {
      if (!connectionFailed) {
        console.warn('[Redis] Connection error — caching disabled:', err.message);
        connectionFailed = true;
      }
    });

    client.on('connect', () => {
      connectionFailed = false;
      console.info('[Redis] Connected');
    });

    return client;
  } catch {
    return null;
  }
}

export function getRedisClient(): Redis | null {
  if (connectionFailed) return null;
  if (!redisClient) {
    redisClient = createRedisClient();
  }
  return redisClient;
}
