/**
 * CSRF protection utilities.
 * Uses the double-submit cookie pattern with a cryptographically random token.
 * Token is stored in a cookie and must be sent in the X-CSRF-Token header for
 * all state-mutating API requests (POST, PUT, PATCH, DELETE).
 */

import { NextRequest, NextResponse } from 'next/server';

export const CSRF_COOKIE = 'csrf_token';
export const CSRF_HEADER = 'x-csrf-token';

/** Generate a cryptographically random CSRF token (hex string) */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint8Array(32);
    crypto.getRandomValues(arr);
    return Array.from(arr)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Node.js fallback
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require('crypto').randomBytes(32).toString('hex');
}

/** Constant-time string comparison to prevent timing attacks */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Validate CSRF token for a request.
 * Reads the token from the cookie and compares with the X-CSRF-Token header.
 * Returns true if valid, false otherwise.
 */
export function validateCsrfToken(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
  const headerToken = request.headers.get(CSRF_HEADER);

  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length < 32 || headerToken.length < 32) return false;

  return safeEqual(cookieToken, headerToken);
}

/**
 * Attach a CSRF token cookie to a response.
 * Call this on GET requests to pages so the client can read the token.
 */
export function attachCsrfCookie(response: NextResponse, token: string): void {
  response.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false, // must be readable by JS to send in header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

/** State-mutating HTTP methods that require CSRF validation */
export const CSRF_PROTECTED_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** Paths exempt from CSRF (public auth endpoints handled by Supabase) */
export const CSRF_EXEMPT_PATHS = [
  '/auth/callback',
  '/api/auth',
];
