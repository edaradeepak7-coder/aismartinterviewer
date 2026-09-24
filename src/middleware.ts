import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { rateLimit, RATE_LIMITS, isLoginLocked } from '@/lib/security/rateLimiter';
import { detectSuspiciousPatterns, isAllowedOrigin } from '@/lib/security/sessionSecurity';
import { generateCsrfToken, attachCsrfCookie, validateCsrfToken, CSRF_PROTECTED_METHODS, CSRF_EXEMPT_PATHS, CSRF_COOKIE } from '@/lib/security/csrf';
import { isDemoMode, isDemoOnlyRoute } from '@/lib/demoMode';

// Roles that require IP whitelist enforcement
const IP_RESTRICTED_ROLES = ['super_admin', 'institution_admin'];

/**
 * Check if an IP is allowed by the whitelist.
 * Fetches the whitelist from Supabase REST API directly (no auth needed for this check).
 * Returns true if whitelist is empty (no restriction) or IP matches an enabled entry.
 */
async function isIpWhitelisted(ip: string, role: string): Promise<boolean> {
  if (!IP_RESTRICTED_ROLES.includes(role)) return true;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return true; // fail open if env missing

    const res = await fetch(
      `${supabaseUrl}/rest/v1/ip_whitelist?enabled=eq.true&select=ip_address,applies_to,expires_at`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        // Short timeout to avoid blocking middleware
        signal: AbortSignal.timeout(2000),
      }
    );

    if (!res.ok) return true; // fail open on DB error

    const entries: Array<{ ip_address: string; applies_to: string[]; expires_at: string | null }> = await res.json();

    // If no entries exist, whitelist is not configured — allow all
    const applicableEntries = entries.filter(
      (e) => e.applies_to.includes(role) && (!e.expires_at || new Date(e.expires_at) > new Date())
    );
    if (applicableEntries.length === 0) return true;

    // Check if IP matches any entry (exact or CIDR prefix match)
    return applicableEntries.some((entry) => {
      const wip = entry.ip_address;
      if (wip === ip) return true;
      // Simple CIDR prefix check (e.g. 192.168.1.0/24 → 192.168.1.)
      if (wip.includes('/')) {
        const [network, bits] = wip.split('/');
        const prefixLen = parseInt(bits, 10);
        if (isNaN(prefixLen)) return false;
        // Convert to binary prefix comparison for IPv4
        const ipParts = ip.split('.').map(Number);
        const netParts = network.split('.').map(Number);
        if (ipParts.length !== 4 || netParts.length !== 4) return false;
        const ipNum = (ipParts[0] << 24) | (ipParts[1] << 16) | (ipParts[2] << 8) | ipParts[3];
        const netNum = (netParts[0] << 24) | (netParts[1] << 16) | (netParts[2] << 8) | netParts[3];
        const mask = prefixLen === 0 ? 0 : (~0 << (32 - prefixLen)) >>> 0;
        return (ipNum & mask) === (netNum & mask);
      }
      return false;
    });
  } catch {
    return true; // fail open on any error
  }
}

/**
 * Log a security event for blocked IP access.
 */
async function logIpBlockedEvent(ip: string, userEmail: string, userRole: string): Promise<void> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) return;

    await fetch(`${supabaseUrl}/rest/v1/ip_whitelist_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ip_address: ip,
        user_email: userEmail,
        user_role: userRole,
        event_type: 'blocked',
        reason: 'IP not in whitelist',
        created_at: new Date().toISOString(),
      }),
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    // Silently fail — logging must not block auth
  }
}

function getProjectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  return url.match(/https:\/\/([^.]+)\./)?.[1] ?? '';
}

function injectTokenFromHeader(request: NextRequest): void {
  const token = request.headers.get('x-sb-token');
  if (!token) return;
  const hasCookie = request.cookies.getAll().some((c) => c.name.includes('auth-token'));
  if (hasCookie) return;
  request.cookies.set(`sb-${getProjectRef()}-auth-token`, token);
}

/** Extract real client IP from common proxy headers */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

// Routes that are publicly accessible without authentication (pages only)
const PUBLIC_PAGE_ROUTES = [
  '/login',
  '/signup',
  '/register',
  '/auth/callback',
  '/offline',
  '/pricing',
  '/candidate-register',
  '/join',
];

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ['/login', '/signup', '/register'];

/** DB roles treated as admins for route gating */
const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'institution_admin',
  'org_admin',
  'placement_officer',
]);

/** DB roles treated as recruiter-or-admin (candidates blocked) */
const RECRUITER_OR_ADMIN_ROLES = new Set([
  ...ADMIN_ROLES,
  'recruiter',
  'evaluator',
  'faculty',
]);

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.has(role);
}

function isRecruiterOrAdminRole(role: string): boolean {
  return RECRUITER_OR_ADMIN_ROLES.has(role);
}

function adminHomeForRole(role: string): string {
  if (role === 'institution_admin') return '/institution-admin';
  if (role === 'org_admin') return '/org-admin';
  if (isAdminRole(role)) return '/admin-dashboard';
  if (isRecruiterOrAdminRole(role)) return '/recruiter-dashboard';
  return '/';
}

// Routes restricted to recruiters and admins only (candidates blocked)
const RECRUITER_ADMIN_ONLY_ROUTES = [
  '/recruiter-dashboard',
  '/analytics',
  '/platform-analytics',
  '/recruiter-feedback',
  '/recruiter-interview',
  '/candidates',
  '/candidate-360',
  '/candidate-segmentation',
  '/interviews',
  '/crm',
  '/admin-dashboard',
  '/super-admin',
  '/institution-admin',
  '/org-admin',
  '/provider-health',
  '/ai-provider-settings',
  '/security-dashboard',
  '/audit-logs',
  '/rls-audit',
  '/admin-diagnostic',
  '/admin-credit-management',
  '/admin-payment-sync',
  '/question-bank',
  '/admin/question-bank',
  '/admin/question-bank-audit',
  '/admin/cohort-analytics',
  '/admin/institution-applications',
];

// Routes restricted to admins only
const ADMIN_ONLY_ROUTES = [
  '/admin-dashboard',
  '/super-admin',
  '/institution-admin',
  '/org-admin',
  '/provider-health',
  '/ai-provider-settings',
  '/api-key-management',
  '/ip-whitelist',
  '/security-dashboard',
  '/audit-logs',
  '/rls-audit',
  '/admin-diagnostic',
  '/admin-credit-management',
  '/admin-payment-sync',
  '/session-management',
  '/alert-thresholds',
  '/pre-launch',
  '/admin/question-bank',
  '/admin/question-bank-audit',
  '/admin/cohort-analytics',
  '/admin/institution-applications',
  '/rbac',
  '/users',
];

// Routes restricted to candidates only (recruiters/admins blocked from confidential candidate data)
const CANDIDATE_ONLY_ROUTES = [
  '/job-offers',
  '/book-interview',
  '/offer-status',
  '/invitations',
];

/** Auth endpoints that need strict rate limiting */
const AUTH_API_PATHS = ['/api/auth', '/auth/callback'];

/** AI endpoints that need AI-tier rate limiting */
const AI_API_PATHS = ['/api/ai/'];

/** Sensitive endpoints (password reset, key validation) */
const SENSITIVE_API_PATHS = ['/api/ai/validate-keys'];

export async function middleware(request: NextRequest) {
  injectTokenFromHeader(request);
  const pathname = request.nextUrl.pathname;
  const ip = getClientIp(request);
  const method = request.method;

  // ── Suspicious pattern detection ──────────────────────────────────────────
  const threats = detectSuspiciousPatterns(request);
  if (threats.length > 0) {
    // Block scanners and injection attempts outright
    if (threats.includes('scanner_detected') || threats.includes('sql_injection') ||
        threats.includes('path_traversal') || threats.includes('null_byte')) {
      return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }});
    }
  }

  // ── CORS / Origin validation for API routes ────────────────────────────────
  const isApiRoute = pathname.startsWith('/api/');
  if (isApiRoute && method !== 'GET' && method !== 'HEAD') {
    if (!isAllowedOrigin(request)) {
      return new NextResponse(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }});
    }
  }

  // ── Rate limiting ──────────────────────────────────────────────────────────
  const isAuthApi = AUTH_API_PATHS.some((p) => pathname.startsWith(p));
  const isAiApi = AI_API_PATHS.some((p) => pathname.startsWith(p));
  const isSensitiveApi = SENSITIVE_API_PATHS.some((p) => pathname.startsWith(p));

  if (isSensitiveApi) {
    const result = rateLimit(`sensitive:${ip}`, RATE_LIMITS.SENSITIVE);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.blockedFor ?? 60)}}
      );
    }
  } else if (isAuthApi) {
    const result = rateLimit(`auth:${ip}`, RATE_LIMITS.AUTH);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.blockedFor ?? 60)}}
      );
    }
  } else if (isAiApi) {
    const result = rateLimit(`ai:${ip}`, RATE_LIMITS.AI);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'AI rate limit exceeded. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.blockedFor ?? 60)}}
      );
    }
  } else if (isApiRoute) {
    const result = rateLimit(`api:${ip}`, RATE_LIMITS.API);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(result.blockedFor ?? 60)}}
      );
    }
  }

  // ── Login page brute-force lockout check ───────────────────────────────────
  const isLoginPage = pathname === '/login';
  if (isLoginPage) {
    const lockStatus = isLoginLocked(ip);
    if (lockStatus.locked) {
      // Still serve the page but attach a lockout header the client can read
      // (actual enforcement happens in the auth flow)
    }
  }

  // ── Auth page rate limiting (login/signup form submissions) ────────────────
  const isAuthPage = AUTH_ROUTES.some((r) => pathname === r);
  if (isAuthPage && method === 'POST') {
    const result = rateLimit(`auth-page:${ip}`, RATE_LIMITS.AUTH);
    if (!result.allowed) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many login attempts. Please wait before trying again.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // ── CSRF validation for state-mutating API requests ────────────────────────
  if (
    isApiRoute &&
    CSRF_PROTECTED_METHODS.has(method) &&
    !CSRF_EXEMPT_PATHS.some((p) => pathname.startsWith(p))
  ) {
    // Skip CSRF for requests that include a Bearer token (programmatic clients)
    const authHeader = request.headers.get('authorization');
    const isBearer = authHeader?.startsWith('Bearer ');
    if (!isBearer && !validateCsrfToken(request)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid or missing CSRF token' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }}
      );
    }
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            supabaseResponse.cookies.set(name, value, options);
          });
        }}}
  );

  const {
    data: { user }} = await supabase.auth.getUser();

  const isPublicPage = PUBLIC_PAGE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  ) || pathname.startsWith('/auth/');

  // Default-deny for pages: require auth unless explicitly public
  // API routes handle their own 401s (do not HTML-redirect)
  if (!user && !isApiRoute && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Quarantine mock-backed screens when demo mode is off
  if (!isApiRoute && !isPublicPage && isDemoOnlyRoute(pathname) && !isDemoMode()) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('demo', 'disabled');
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route);
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/insights';
    return NextResponse.redirect(url);
  }

  // Role-based route guards (authenticated page requests only)
  if (user && !isApiRoute && !isPublicPage) {
    // Fetch user role from user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role ?? 'candidate';

    // ── IP Whitelist enforcement for super_admin and institution_admin ─────────
    if (IP_RESTRICTED_ROLES.includes(role)) {
      const allowed = await isIpWhitelisted(ip, role);
      if (!allowed) {
        // Log the blocked attempt asynchronously
        logIpBlockedEvent(ip, user.email ?? '', role);
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        url.searchParams.set('blocked', 'ip');
        return NextResponse.redirect(url);
      }
    }

    // Block candidates from recruiter/admin-only routes
    const isRecruiterAdminOnly = RECRUITER_ADMIN_ONLY_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route)
    );
    if (isRecruiterAdminOnly && !isRecruiterOrAdminRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }

    // Block non-admins from admin-only routes (includes super_admin, institution_admin, …)
    const isAdminOnly = ADMIN_ONLY_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route)
    );
    if (isAdminOnly && !isAdminRole(role)) {
      const url = request.nextUrl.clone();
      url.pathname = isRecruiterOrAdminRole(role) ? '/recruiter-dashboard' : '/';
      return NextResponse.redirect(url);
    }

    // Block recruiters/admins from candidate-only routes (confidential candidate data)
    const isCandidateOnly = CANDIDATE_ONLY_ROUTES.some(
      (route) => pathname === route || pathname.startsWith(route)
    );
    if (isCandidateOnly && role !== 'candidate') {
      const url = request.nextUrl.clone();
      url.pathname = adminHomeForRole(role);
      return NextResponse.redirect(url);
    }
  }

  // ── Attach CSRF token cookie on page loads (GET requests to non-API routes) ─
  if (method === 'GET' && !isApiRoute) {
    const existingCsrf = request.cookies.get(CSRF_COOKIE)?.value;
    if (!existingCsrf || existingCsrf.length < 32) {
      const token = generateCsrfToken();
      attachCsrfCookie(supabaseResponse, token);
    }
  }

  // ── Security headers on all responses ─────────────────────────────────────
  supabaseResponse.headers.set('X-Content-Type-Options', 'nosniff');
  supabaseResponse.headers.set('X-XSS-Protection', '1; mode=block');
  supabaseResponse.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  supabaseResponse.headers.set(
    'Permissions-Policy',
    'camera=(self), microphone=(self), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()'
  );

  // API responses must not be cached
  if (isApiRoute) {
    supabaseResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set('Expires', '0');
  }

  // Prevent clickjacking on page responses
  if (!isApiRoute) {
    supabaseResponse.headers.set('X-Frame-Options', 'DENY');
    supabaseResponse.headers.set(
      'Content-Security-Policy',
      "frame-ancestors 'none'"
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']};
