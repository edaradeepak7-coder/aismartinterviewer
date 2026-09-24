import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';

const ADMIN_ROLES = new Set([
  'super_admin',
  'admin',
  'org_admin',
  'institution_admin',
]);

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

/**
 * GET /api/security-dashboard
 * Aggregates blocked IPs, failed logins, rate violations, suspicious events, charts.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || !ADMIN_ROLES.has(profile.role)) {
      return forbiddenResponse('Admin access required');
    }

    const now = Date.now();
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      blockedRes,
      eventsRes,
      failedViewRes,
      hourlyViewRes,
      heatEventsRes,
    ] = await Promise.all([
      supabase
        .from('blocked_ips')
        .select(
          'id, ip_address, reason, attempts, blocked_at, expires_at, is_permanent, country_code',
        )
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('blocked_at', { ascending: false })
        .limit(50),
      supabase
        .from('security_events')
        .select(
          'id, event_type, ip_address, user_email, severity, description, details, resolved, created_at',
        )
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('failed_logins_summary').select('*').limit(30),
      supabase.from('hourly_threat_counts').select('*').limit(48),
      supabase
        .from('security_events')
        .select('created_at, severity')
        .gte('created_at', weekAgo)
        .limit(2000),
    ]);

    // Active blocked IPs (also drop expired client-side if or-filter missed)
    const blockedIps = (blockedRes.data || [])
      .filter((row) => {
        if (row.is_permanent) return true;
        if (!row.expires_at) return true;
        return new Date(row.expires_at).getTime() > now;
      })
      .map((row) => {
        const expiresMs = row.expires_at
          ? Math.max(0, Math.floor((new Date(row.expires_at).getTime() - now) / 1000))
          : row.is_permanent
            ? 999999
            : 0;
        return {
          ip: row.ip_address as string,
          reason: (row.reason as string) || 'Blocked',
          attempts: Number(row.attempts) || 0,
          blockedAt: (row.blocked_at as string) || new Date().toISOString(),
          country: (row.country_code as string) || '—',
          lockedFor: expiresMs,
        };
      });

    const events = eventsRes.data || [];

    // Rate-limit violations from security_events
    const rateViolations = events
      .filter((e) => e.event_type === 'rate_limit_violation')
      .slice(0, 20)
      .map((e) => {
        const details = (e.details || {}) as Record<string, unknown>;
        const requests = Number(details.requests ?? details.count ?? 0) || 0;
        const limit = Number(details.limit ?? 60) || 60;
        const windowSecs = Number(details.windowSecs ?? details.window_secs ?? 60) || 60;
        const blockedUntil =
          (typeof details.blockedUntil === 'string' && details.blockedUntil) ||
          (typeof details.blocked_until === 'string' && details.blocked_until) ||
          e.created_at;
        return {
          ip: (e.ip_address as string) || '—',
          endpoint: String(details.endpoint ?? details.path ?? '/api/*'),
          requests,
          limit,
          windowSecs,
          blockedUntil: blockedUntil as string,
        };
      });

    // Suspicious patterns (non rate-limit)
    const suspicious = events
      .filter((e) => e.event_type !== 'rate_limit_violation' && e.event_type !== 'blocked_ip')
      .slice(0, 30)
      .map((e) => {
        const details = (e.details || {}) as Record<string, unknown>;
        const typeLabel = String(e.event_type || 'suspicious_pattern')
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());
        return {
          id: e.id as string,
          type: typeLabel,
          description: (e.description as string) || 'Suspicious activity detected',
          ip: (e.ip_address as string) || '—',
          severity: (['low', 'medium', 'high', 'critical'].includes(String(e.severity))
            ? e.severity
            : 'low') as 'low' | 'medium' | 'high' | 'critical',
          detectedAt: (e.created_at as string) || new Date().toISOString(),
          count: Number(details.count ?? details.attempts ?? 1) || 1,
        };
      });

    // Failed logins — prefer view; fallback to audit_logs aggregation
    let failedLogins: Array<{
      email: string;
      role: string;
      attempts: number;
      lastAttempt: string;
      ip: string;
      locked: boolean;
    }> = [];

    if (!failedViewRes.error && failedViewRes.data) {
      failedLogins = failedViewRes.data.map((row) => ({
        email: String(row.user_email || 'unknown'),
        role: String(row.user_role || '—'),
        attempts: Number(row.attempt_count) || 0,
        lastAttempt: String(row.last_attempt || new Date().toISOString()),
        ip: String(row.last_ip || '—'),
        locked: Boolean(row.is_locked),
      }));
    } else {
      const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const { data: auditFails } = await supabase
        .from('audit_logs')
        .select('user_email, user_role, ip_address, created_at')
        .eq('action', 'login_failed')
        .gte('created_at', since24h)
        .order('created_at', { ascending: false })
        .limit(500);

      const byEmail = new Map<
        string,
        {
          email: string;
          role: string;
          attempts: number;
          lastAttempt: string;
          ip: string;
        }
      >();
      for (const row of auditFails || []) {
        const email = String(row.user_email || 'unknown');
        const existing = byEmail.get(email);
        if (!existing) {
          byEmail.set(email, {
            email,
            role: String(row.user_role || '—'),
            attempts: 1,
            lastAttempt: String(row.created_at),
            ip: String(row.ip_address || '—'),
          });
        } else {
          existing.attempts += 1;
        }
      }
      failedLogins = Array.from(byEmail.values())
        .sort((a, b) => b.attempts - a.attempts)
        .slice(0, 30)
        .map((u) => ({ ...u, locked: u.attempts >= 10 }));
    }

    // Enrich locked from user_profiles.locked_until
    const emails = failedLogins.map((f) => f.email).filter((e) => e.includes('@'));
    if (emails.length) {
      const { data: lockedProfiles } = await supabase
        .from('user_profiles')
        .select('email, locked_until, failed_login_count')
        .in('email', emails);
      const lockMap = new Map(
        (lockedProfiles || []).map((p) => [
          String(p.email).toLowerCase(),
          {
            locked:
              p.locked_until != null &&
              new Date(p.locked_until as string).getTime() > now,
          },
        ]),
      );
      failedLogins = failedLogins.map((f) => {
        const info = lockMap.get(f.email.toLowerCase());
        return info ? { ...f, locked: f.locked || info.locked } : f;
      });
    }

    // Hourly failed-login chart (24 buckets)
    const hourBuckets: Record<string, number> = {};
    for (let h = 0; h < 24; h++) {
      hourBuckets[String(h).padStart(2, '0')] = 0;
    }

    if (!hourlyViewRes.error && hourlyViewRes.data?.length) {
      for (const row of hourlyViewRes.data) {
        const d = new Date(row.hour_bucket as string);
        if (Number.isNaN(d.getTime())) continue;
        const key = String(d.getUTCHours()).padStart(2, '0');
        hourBuckets[key] =
          (hourBuckets[key] || 0) +
          Number(row.failure_count ?? row.event_count ?? 0);
      }
    } else {
      // Approximate from failedLogins lastAttempt times is weak; pull audit again lightly
      const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
      const { data: hourlyAudit } = await supabase
        .from('audit_logs')
        .select('created_at')
        .in('action', ['login_failed', 'login_locked', 'suspicious_activity', 'mfa_failed'])
        .gte('created_at', since24h)
        .limit(1000);
      for (const row of hourlyAudit || []) {
        const d = new Date(row.created_at as string);
        if (Number.isNaN(d.getTime())) continue;
        const key = String(d.getHours()).padStart(2, '0');
        hourBuckets[key] = (hourBuckets[key] || 0) + 1;
      }
    }

    const failedLoginChart = Object.entries(hourBuckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([hour, count]) => ({ hour, count }));

    // Threat heatmap: day × hour from security_events (last 7d)
    const heatMap = new Map<string, number>();
    for (const row of heatEventsRes.data || []) {
      const d = new Date(row.created_at as string);
      if (Number.isNaN(d.getTime())) continue;
      const day = DAYS[d.getDay()];
      const hour = d.getHours();
      const key = `${day}-${hour}`;
      heatMap.set(key, (heatMap.get(key) || 0) + 1);
    }
    // Also fold in unresolved event weight from audit if security_events empty
    if ((heatEventsRes.data || []).length === 0) {
      const { data: auditHeat } = await supabase
        .from('audit_logs')
        .select('created_at')
        .in('action', [
          'login_failed',
          'login_locked',
          'suspicious_activity',
          'mfa_failed',
        ])
        .gte('created_at', weekAgo)
        .limit(2000);
      for (const row of auditHeat || []) {
        const d = new Date(row.created_at as string);
        if (Number.isNaN(d.getTime())) continue;
        const day = DAYS[d.getDay()];
        const hour = d.getHours();
        const key = `${day}-${hour}`;
        heatMap.set(key, (heatMap.get(key) || 0) + 1);
      }
    }

    const heatmap = (['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const).flatMap(
      (day) =>
        Array.from({ length: 24 }, (_, hour) => ({
          day,
          hour,
          value: heatMap.get(`${day}-${hour}`) || 0,
        })),
    );

    const failedLoginAttempts = failedLogins.reduce((s, l) => s + l.attempts, 0);
    const criticalCount = suspicious.filter((s) => s.severity === 'critical').length;
    const totalThreats = blockedIps.length + suspicious.length;

    return secureJson({
      data: {
        blockedIps,
        failedLogins,
        rateViolations,
        suspicious,
        failedLoginChart,
        heatmap,
        kpis: {
          blockedIps: blockedIps.length,
          failedLoginAttempts,
          rateViolations: rateViolations.length,
          totalThreats,
          criticalCount,
        },
      },
      meta: {
        blockedError: blockedRes.error?.message || null,
        eventsError: eventsRes.error?.message || null,
        failedViewError: failedViewRes.error?.message || null,
        hourlyViewError: hourlyViewRes.error?.message || null,
      },
    });
  } catch {
    return serverErrorResponse();
  }
}
