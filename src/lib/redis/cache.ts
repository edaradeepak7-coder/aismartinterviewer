/**
 * Redis cache service — get/set/invalidate helpers with graceful no-op fallback.
 * All methods are safe to call even when Redis is unavailable.
 */
import { getRedisClient } from './client';
import crypto from 'crypto';

export const CACHE_TTL = {
  AI_RESPONSE: 60 * 60 * 6,      // 6 hours — AI completions are expensive & stable
  AI_EVALUATION: 60 * 60 * 24,   // 24 hours — evaluation results don't change
  SESSION_DATA: 60 * 5,           // 5 minutes — session/profile data
  QUESTION_BANK: 60 * 30,         // 30 minutes — question lists
} as const;

/**
 * Build a deterministic cache key from an object payload.
 * Uses SHA-256 so long prompts don't bloat key names.
 */
export function buildCacheKey(namespace: string, payload: unknown): string {
  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex')
    .slice(0, 16);
  return `${namespace}:${hash}`;
}

/**
 * Get a cached value. Returns null on cache miss or Redis unavailability.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = getRedisClient();
    if (!client) return null;
    const raw = await client.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL (seconds). No-op if Redis unavailable.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    await client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Silently ignore — caching is best-effort
  }
}

/**
 * Delete one or more cache keys. No-op if Redis unavailable.
 */
export async function cacheInvalidate(...keys: string[]): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client || keys.length === 0) return;
    await client.del(...keys);
  } catch {
    // Silently ignore
  }
}

/**
 * Delete all keys matching a pattern (e.g. "ai:chat:*").
 * Use sparingly — SCAN is O(N) across keyspace.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  try {
    const client = getRedisClient();
    if (!client) return;
    let cursor = '0';
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
      }
    } while (cursor !== '0');
  } catch {
    // Silently ignore
  }
}
