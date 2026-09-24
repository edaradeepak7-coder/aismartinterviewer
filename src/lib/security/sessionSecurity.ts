/**
 * Session security utilities.
 * Provides session fingerprinting and suspicious activity detection.
 */

import { NextRequest } from 'next/server';

/**
 * Build a lightweight session fingerprint from request headers.
 * Used to detect session hijacking (IP/UA change mid-session).
 */
export function buildSessionFingerprint(request: NextRequest): string {
  const ua = request.headers.get('user-agent') ?? '';
  const lang = request.headers.get('accept-language') ?? '';
  const encoding = request.headers.get('accept-encoding') ?? '';

  // Hash-like combination (not cryptographic — just for change detection)
  const raw = `${ua}|${lang}|${encoding}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Detect suspicious request patterns that may indicate an attack.
 * Returns an array of warning strings (empty = clean).
 */
export function detectSuspiciousPatterns(request: NextRequest): string[] {
  const warnings: string[] = [];
  const url = request.nextUrl.pathname + request.nextUrl.search;

  // Path traversal
  if (/\.\.[/\\]/.test(url)) warnings.push('path_traversal');

  // SQL injection patterns
  if (/(\bunion\b.*\bselect\b|\bselect\b.*\bfrom\b|\bdrop\b.*\btable\b|\binsert\b.*\binto\b)/i.test(url)) {
    warnings.push('sql_injection');
  }

  // XSS patterns in URL
  if (/<script|javascript:|on\w+\s*=/i.test(decodeURIComponent(url))) {
    warnings.push('xss_attempt');
  }

  // Null byte injection
  if (url.includes('\0') || url.includes('%00')) warnings.push('null_byte');

  // Excessively long URL (> 2048 chars)
  if (url.length > 2048) warnings.push('oversized_url');

  // Missing or suspicious User-Agent
  const ua = request.headers.get('user-agent') ?? '';
  if (!ua || ua.length < 5) warnings.push('missing_user_agent');

  // Common scanner/bot signatures
  if (/sqlmap|nikto|nmap|masscan|zgrab|nuclei|dirbuster|gobuster/i.test(ua)) {
    warnings.push('scanner_detected');
  }

  return warnings;
}

/**
 * Check if a request origin is allowed (CORS/SSRF protection).
 * Returns true if the origin is trusted.
 */
export function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return true; // same-origin requests have no Origin header

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const allowedOrigins = [
    siteUrl,
    // Allow localhost in development (matches next.dev -p and common ports)
    ...(process.env.NODE_ENV !== 'production'
      ? [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:4028',
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:4028',
        ]
      : []),
  ].filter(Boolean);

  // Exact match only — never allow arbitrary https origins
  return allowedOrigins.some((allowed) => origin === allowed);
}

/** Sanitize redirect URLs to prevent open redirect attacks */
export function sanitizeRedirectUrl(next: string | null, fallback = '/'): string {
  if (!next) return fallback;
  // Only allow relative paths starting with /
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('://')) {
    return fallback;
  }
  // Block redirects to auth/admin paths from untrusted sources
  const blocked = ['/api/', '/auth/callback'];
  if (blocked.some((b) => next.startsWith(b))) return fallback;
  return next;
}
