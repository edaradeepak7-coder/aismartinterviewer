/**
 * Per-user token bucket rate limiter for Next.js API routes.
 * Implements the token bucket algorithm: tokens refill at a steady rate,
 * each request consumes one token. Prevents burst abuse while allowing
 * short bursts up to the bucket capacity.
 */

interface TokenBucket {
  tokens: number;
  lastRefill: number;
  /** Total requests blocked (for observability) */
  blockedCount: number;
}

// In-memory store: key → bucket
const buckets = new Map<string, TokenBucket>();

// Cleanup every 10 minutes — remove buckets idle for > 30 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 30 * 60 * 1000) {
        buckets.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

export interface TokenBucketConfig {
  /** Max tokens (burst capacity) */
  capacity: number;
  /** Tokens added per second (refill rate) */
  refillRate: number;
  /** Tokens consumed per request (default: 1) */
  cost?: number;
}

export interface TokenBucketResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until at least 1 token is available */
  retryAfter?: number;
  /** Total requests blocked for this key */
  blockedCount?: number;
}

/**
 * Check and consume tokens from a user's bucket.
 * @param key  Unique identifier — typically `userId:routeName` or `ip:routeName`
 * @param config  Bucket configuration
 */
export function consumeToken(key: string, config: TokenBucketConfig): TokenBucketResult {
  const now = Date.now();
  const cost = config.cost ?? 1;

  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: config.capacity, lastRefill: now, blockedCount: 0 };
    buckets.set(key, bucket);
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000; // seconds
  const refilled = elapsed * config.refillRate;
  bucket.tokens = Math.min(config.capacity, bucket.tokens + refilled);
  bucket.lastRefill = now;

  if (bucket.tokens < cost) {
    bucket.blockedCount += 1;
    // How long until enough tokens are available
    const tokensNeeded = cost - bucket.tokens;
    const retryAfter = Math.ceil(tokensNeeded / config.refillRate);
    return {
      allowed: false,
      remaining: Math.floor(bucket.tokens),
      retryAfter,
      blockedCount: bucket.blockedCount,
    };
  }

  bucket.tokens -= cost;
  return {
    allowed: true,
    remaining: Math.floor(bucket.tokens),
    blockedCount: bucket.blockedCount,
  };
}

/**
 * Preset token bucket configs for different route categories.
 */
export const TOKEN_BUCKET_CONFIGS = {
  /** Bulk export: expensive DB queries — 5 requests/min, burst up to 3 */
  BULK_EXPORT: { capacity: 3, refillRate: 5 / 60 } as TokenBucketConfig,
  /** OpenAI / AI routes: expensive LLM calls — 20/min, burst up to 5 */
  AI: { capacity: 5, refillRate: 20 / 60 } as TokenBucketConfig,
  /** Notification routes: moderate — 30/min, burst up to 10 */
  NOTIFICATIONS: { capacity: 10, refillRate: 30 / 60 } as TokenBucketConfig,
  /** General Supabase data routes — 60/min, burst up to 20 */
  SUPABASE_DATA: { capacity: 20, refillRate: 60 / 60 } as TokenBucketConfig,
  /** Supabase write/mutation routes — 20/min, burst up to 5 */
  SUPABASE_WRITE: { capacity: 5, refillRate: 20 / 60 } as TokenBucketConfig,
} as const;

/**
 * Build a rate-limit response with standard headers.
 */
export function rateLimitedResponse(result: TokenBucketResult, routeName: string): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Route': routeName,
  };
  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
    headers['X-RateLimit-Reset'] = String(Math.ceil(Date.now() / 1000) + result.retryAfter);
  }
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: `Rate limit exceeded for ${routeName}. ${result.retryAfter ? `Retry after ${result.retryAfter}s.` : ''}`,
      retryAfter: result.retryAfter,
    }),
    { status: 429, headers }
  );
}

/**
 * Extract a user identifier from a Supabase user object or fall back to IP.
 */
export function getUserKey(userId: string | null | undefined, ip: string, routeName: string): string {
  const id = userId ?? ip ?? 'anonymous';
  return `${id}:${routeName}`;
}
