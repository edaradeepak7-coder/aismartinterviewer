/**
 * In-memory rate limiter for Next.js API routes.
 * Uses a sliding window algorithm per IP address.
 * Includes progressive backoff for repeated violations.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
  violations: number;
  blockedUntil?: number;
}

const store = new Map<string, RateLimitEntry>();

// Brute-force login tracker: tracks failed login attempts per IP
const loginFailures = new Map<string, { count: number; lockedUntil?: number }>();

// Clean up expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      if (entry.resetAt < now && !entry.blockedUntil) store.delete(key);
    }
    for (const [key, entry] of loginFailures.entries()) {
      if (!entry.lockedUntil || entry.lockedUntil < now) loginFailures.delete(key);
    }
  }, 5 * 60 * 1000);
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  limit: number;
  /** Window duration in seconds */
  windowSecs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  blockedFor?: number; // seconds remaining in block
}

export function rateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const windowMs = config.windowSecs * 1000;

  const entry = store.get(identifier);

  // Check if currently in progressive block
  if (entry?.blockedUntil && entry.blockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.blockedUntil,
      blockedFor: Math.ceil((entry.blockedUntil - now) / 1000),
    };
  }

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt, violations: entry?.violations ?? 0 });
    return { allowed: true, remaining: config.limit - 1, resetAt };
  }

  if (entry.count >= config.limit) {
    // Progressive backoff: 1min → 5min → 15min → 30min
    const violations = (entry.violations ?? 0) + 1;
    const backoffMs = [60, 300, 900, 1800][Math.min(violations - 1, 3)] * 1000;
    const blockedUntil = now + backoffMs;
    store.set(identifier, { ...entry, violations, blockedUntil });
    return {
      allowed: false,
      remaining: 0,
      resetAt: blockedUntil,
      blockedFor: Math.ceil(backoffMs / 1000),
    };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Track failed login attempts per IP.
 * Returns { allowed: true } if under threshold, { allowed: false, lockedFor } if locked.
 */
export function trackLoginFailure(ip: string): { allowed: boolean; lockedFor?: number } {
  const now = Date.now();
  const entry = loginFailures.get(ip) ?? { count: 0 };

  // Still locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return { allowed: false, lockedFor: Math.ceil((entry.lockedUntil - now) / 1000) };
  }

  const newCount = entry.count + 1;

  // Lock thresholds: 5 failures → 5min, 10 → 15min, 15+ → 60min
  let lockedUntil: number | undefined;
  if (newCount >= 15) lockedUntil = now + 60 * 60 * 1000;
  else if (newCount >= 10) lockedUntil = now + 15 * 60 * 1000;
  else if (newCount >= 5) lockedUntil = now + 5 * 60 * 1000;

  loginFailures.set(ip, { count: newCount, lockedUntil });
  return { allowed: true };
}

/** Reset login failure count on successful login */
export function resetLoginFailures(ip: string): void {
  loginFailures.delete(ip);
}

/** Check if an IP is currently locked out from login */
export function isLoginLocked(ip: string): { locked: boolean; lockedFor?: number } {
  const now = Date.now();
  const entry = loginFailures.get(ip);
  if (!entry?.lockedUntil || entry.lockedUntil <= now) return { locked: false };
  return { locked: true, lockedFor: Math.ceil((entry.lockedUntil - now) / 1000) };
}

/** Preset configs */
export const RATE_LIMITS = {
  /** Very strict: auth endpoints (login, signup) — 5 req/min */
  AUTH: { limit: 5, windowSecs: 60 } as RateLimitConfig,
  /** Standard: general API routes — 60 req/min */
  API: { limit: 60, windowSecs: 60 } as RateLimitConfig,
  /** Relaxed: read-heavy endpoints */
  READ: { limit: 120, windowSecs: 60 } as RateLimitConfig,
  /** Strict: AI endpoints (expensive) — 15 req/min */
  AI: { limit: 15, windowSecs: 60 } as RateLimitConfig,
  /** Very strict: password reset / sensitive ops — 3 req/15min */
  SENSITIVE: { limit: 3, windowSecs: 900 } as RateLimitConfig,
};
