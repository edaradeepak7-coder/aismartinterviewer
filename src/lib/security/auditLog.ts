/**
 * Audit trail service.
 * Logs all user actions with timestamps, IP, role, and outcome.
 * Used for forensics and compliance investigations.
 */

export type AuditAction =
  | 'login' |'logout' |'login_failed' |'login_locked' |'mfa_verified' |'mfa_failed' |'mfa_enrolled' |'mfa_unenrolled' |'session_revoked' |'role_changed' |'data_accessed' |'data_created' |'data_updated' |'data_deleted' |'api_call' |'export' |'suspicious_activity' |'password_reset' |'email_verified';

export interface AuditLogEntry {
  id?: string;
  user_id?: string;
  user_email?: string;
  user_role?: string;
  action: AuditAction;
  resource?: string;        // e.g., "interview", "candidate", "user_profile"
  resource_id?: string;     // UUID of the affected resource
  ip_address?: string;
  user_agent?: string;
  outcome: 'success' | 'failure' | 'blocked';
  details?: Record<string, unknown>;
  created_at?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Write an audit log entry to Supabase.
 * Silently fails — audit logging must never break the main flow.
 */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/audit_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        ...entry,
        created_at: entry.created_at ?? new Date().toISOString(),
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.warn('[AuditLog] Write failed:', text);
    }
  } catch (err) {
    console.warn('[AuditLog] Error writing audit log:', err);
  }
}

/**
 * Server-side audit log writer (uses service role for guaranteed writes).
 * Use this in API routes where you have the Supabase server client.
 */
export async function writeAuditLogServer(
  entry: AuditLogEntry,
  supabaseClient?: unknown
): Promise<void> {
  try {
    let client = supabaseClient as any;
    if (!client) {
      const { createClient } = await import('@/lib/supabase/server');
      client = await createClient();
    }
    const { error } = await client.from('audit_logs').insert({
      ...entry,
      created_at: entry.created_at ?? new Date().toISOString(),
    });
    if (error) {
      console.warn('[AuditLog] Server write failed:', error.message);
    }
  } catch (err) {
    console.warn('[AuditLog] Server error writing audit log:', err);
  }
}

/**
 * Extract IP address from a Next.js request.
 */
export function extractIpFromRequest(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Extract User-Agent from a request.
 */
export function extractUserAgent(request: Request): string {
  return request.headers.get('user-agent') ?? 'unknown';
}

/**
 * Build a standard audit entry from a Next.js API request.
 */
export function buildAuditEntry(
  request: Request,
  action: AuditAction,
  outcome: AuditLogEntry['outcome'],
  overrides: Partial<AuditLogEntry> = {}
): AuditLogEntry {
  return {
    action,
    outcome,
    ip_address: extractIpFromRequest(request),
    user_agent: extractUserAgent(request),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}
