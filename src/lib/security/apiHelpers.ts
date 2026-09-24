/**
 * Security helpers for API route responses.
 * Adds security headers to all API responses.
 */
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from './sanitize';

/**
 * Require an authenticated Supabase user for API routes.
 * Returns the user, or a 401 NextResponse when unauthenticated.
 */
export async function requireAuthenticatedUser(): Promise<
  { user: User; error?: never } | { user?: never; error: NextResponse }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: unauthorizedResponse() };
  }
  return { user };
}

/** Standard security headers for API responses (not page responses) */
export function withSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

/** Return a rate-limit exceeded response */
export function rateLimitResponse(resetAt: number): NextResponse {
  const res = NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429 }
  );
  res.headers.set('Retry-After', String(Math.ceil((resetAt - Date.now()) / 1000)));
  return withSecurityHeaders(res);
}

/** Return an unauthorized response */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return withSecurityHeaders(
    NextResponse.json({ error: message }, { status: 401 })
  );
}

/** Return a bad request response */
export function badRequestResponse(message: string): NextResponse {
  return withSecurityHeaders(
    NextResponse.json({ error: message }, { status: 400 })
  );
}

/** Return a forbidden response */
export function forbiddenResponse(message = 'Forbidden'): NextResponse {
  return withSecurityHeaders(
    NextResponse.json({ error: message }, { status: 403 })
  );
}

/** Return a not found response (avoids leaking resource existence) */
export function notFoundResponse(message = 'Not found'): NextResponse {
  return withSecurityHeaders(
    NextResponse.json({ error: message }, { status: 404 })
  );
}

/** Return a generic server error (never expose internal details) */
export function serverErrorResponse(): NextResponse {
  return withSecurityHeaders(
    NextResponse.json({ error: 'An internal error occurred' }, { status: 500 })
  );
}

/** Wrap a successful JSON response with security headers */
export function secureJson(data: unknown, status = 200): NextResponse {
  return withSecurityHeaders(NextResponse.json(data, { status }));
}

/**
 * Validate and extract a UUID path parameter.
 * Returns the UUID string or null if invalid.
 */
export function extractUUID(params: Record<string, string>, key = 'id'): string | null {
  const val = params[key];
  if (!isValidUUID(val)) return null;
  return val;
}

/**
 * Safely parse a JSON request body with size limit.
 * Returns null if body is too large or malformed.
 */
export async function safeParseBody<T = Record<string, unknown>>(
  request: Request,
  maxBytes = 512_000 // 512 KB
): Promise<T | null> {
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/**
 * Sanitize a search query string for safe use in DB queries.
 * Strips special characters that could be used for injection.
 */
export function sanitizeSearchQuery(query: unknown, maxLen = 200): string {
  const s = sanitizeString(query);
  // Remove SQL wildcard abuse and special DB chars
  return s.replace(/[%_\\;'"]/g, '').slice(0, maxLen);
}
