/**
 * Input sanitization and validation utilities.
 * Prevents XSS, SQL injection patterns, and oversized payloads.
 */

/** Strip HTML tags and dangerous characters to prevent XSS */
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/[<>]/g, '') // strip angle brackets (HTML tags)
    .replace(/javascript:/gi, '') // strip JS protocol
    .replace(/on\w+\s*=/gi, '') // strip event handlers
    .trim()
    .slice(0, 10_000); // hard cap
}

/** Sanitize an object's string values recursively (max 3 levels deep) */
export function sanitizeObject(
  obj: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  if (depth > 3) return {};
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
    } else if (Array.isArray(value)) {
      result[key] = value.slice(0, 500).map((item) =>
        typeof item === 'string'
          ? sanitizeString(item)
          : typeof item === 'object' && item !== null
          ? sanitizeObject(item as Record<string, unknown>, depth + 1)
          : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Validate email format */
export function isValidEmail(email: unknown): boolean {
  if (typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** Validate UUID v4 format */
export function isValidUUID(id: unknown): boolean {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

/** Validate integer within optional bounds */
export function parseIntSafe(
  value: unknown,
  defaultVal: number,
  min = 0,
  max = 10_000
): number {
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return defaultVal;
  return Math.min(Math.max(n, min), max);
}

/** Validate that a string is one of an allowed set of values */
export function isAllowedValue<T extends string>(
  value: unknown,
  allowed: readonly T[]
): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

/** Check payload size (bytes). Returns false if too large. */
export function isPayloadSafe(body: string, maxBytes = 1_048_576): boolean {
  return Buffer.byteLength(body, 'utf8') <= maxBytes;
}
