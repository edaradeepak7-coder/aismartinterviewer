import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { writeAuditLogServer } from '@/lib/security/auditLog';

const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'org_admin',
  'institution_admin',
]);

const EVENT_TYPES = new Set([
  'policy_violation',
  'unauthorized_access',
  'data_exposure_risk',
  'suspicious_query',
]);

const RISK_LEVELS = new Set(['low', 'medium', 'high', 'critical']);
const OPERATIONS = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE']);

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: unauthorizedResponse() as Response };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !ADMIN_ROLES.has(profile.role)) {
    return { error: forbiddenResponse('Admin access required') as Response };
  }
  return { supabase, user, profile };
}

/**
 * GET /api/rls-audit?event_type=&risk_level=&resolved=&q=&limit=
 * POST create event (instrumentation / manual report)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase } = auth as Awaited<ReturnType<typeof requireAdmin>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const url = request.nextUrl;
    const eventType = url.searchParams.get('event_type');
    const riskLevel = url.searchParams.get('risk_level');
    const resolvedParam = url.searchParams.get('resolved');
    const q = sanitizeString(url.searchParams.get('q') || '').slice(0, 100);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(url.searchParams.get('limit') || '100', 10) || 100),
    );

    if (eventType && eventType !== 'all' && !EVENT_TYPES.has(eventType)) {
      return badRequestResponse('Invalid event_type');
    }
    if (riskLevel && riskLevel !== 'all' && !RISK_LEVELS.has(riskLevel)) {
      return badRequestResponse('Invalid risk_level');
    }

    let query = supabase
      .from('rls_audit_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (eventType && eventType !== 'all') query = query.eq('event_type', eventType);
    if (riskLevel && riskLevel !== 'all') query = query.eq('risk_level', riskLevel);
    if (resolvedParam === 'open' || resolvedParam === 'false') {
      query = query.eq('resolved', false);
    } else if (resolvedParam === 'resolved' || resolvedParam === 'true') {
      query = query.eq('resolved', true);
    }

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    let events = data || [];
    if (q) {
      const lower = q.toLowerCase();
      events = events.filter(
        (e) =>
          String(e.user_email || '')
            .toLowerCase()
            .includes(lower) ||
          String(e.table_name || '')
            .toLowerCase()
            .includes(lower) ||
          String(e.ip_address || '')
            .toLowerCase()
            .includes(lower) ||
          String(e.policy_name || '')
            .toLowerCase()
            .includes(lower),
      );
    }

    const { count: totalCount } = await supabase
      .from('rls_audit_events')
      .select('*', { count: 'exact', head: true });
    const { count: criticalCount } = await supabase
      .from('rls_audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('risk_level', 'critical');
    const { count: openCount } = await supabase
      .from('rls_audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('resolved', false);
    const { count: violationCount } = await supabase
      .from('rls_audit_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_type', 'policy_violation');

    return secureJson({
      data: events,
      kpis: {
        total: totalCount ?? events.length,
        critical: criticalCount ?? 0,
        open: openCount ?? 0,
        violations: violationCount ?? 0,
      },
    });
  } catch {
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase, user, profile } = auth as Awaited<
      ReturnType<typeof requireAdmin>
    > & {
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string; email?: string };
      profile: { role: string; email?: string };
    };

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const event_type = String(body.event_type || '');
    const table_name = sanitizeString(String(body.table_name || '')).slice(0, 120);
    const operation = String(body.operation || 'SELECT').toUpperCase();
    const risk_level = String(body.risk_level || 'medium');

    if (!EVENT_TYPES.has(event_type)) return badRequestResponse('Invalid event_type');
    if (!table_name) return badRequestResponse('table_name required');
    if (!OPERATIONS.has(operation)) return badRequestResponse('Invalid operation');
    if (!RISK_LEVELS.has(risk_level)) return badRequestResponse('Invalid risk_level');

    const row = {
      event_type,
      user_id: body.user_id && isValidUUID(String(body.user_id)) ? String(body.user_id) : null,
      user_email: sanitizeString(String(body.user_email || '')).slice(0, 254) || null,
      user_role: sanitizeString(String(body.user_role || '')).slice(0, 60) || null,
      table_name,
      operation,
      policy_name: sanitizeString(String(body.policy_name || '')).slice(0, 120) || null,
      resource_id: sanitizeString(String(body.resource_id || '')).slice(0, 120) || null,
      ip_address:
        sanitizeString(
          String(
            body.ip_address ||
              request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
              '',
          ),
        ).slice(0, 64) || null,
      user_agent: sanitizeString(request.headers.get('user-agent') || '').slice(0, 300) || null,
      query_snippet: sanitizeString(String(body.query_snippet || '')).slice(0, 500) || null,
      risk_level,
      details: (body.details && typeof body.details === 'object' ? body.details : {}) as Record<
        string,
        unknown
      >,
    };

    const { data, error } = await supabase
      .from('rls_audit_events')
      .insert(row)
      .select('*')
      .single();

    if (error) return secureJson({ error: error.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'rls_audit_event_created',
        resource: 'rls_audit_events',
        resource_id: data.id,
        outcome: 'success',
        details: { event_type, table_name, risk_level },
      },
      supabase,
    );

    return secureJson({ data }, 201);
  } catch {
    return serverErrorResponse();
  }
}

/**
 * PATCH /api/rls-audit — resolve or escalate
 * body: { id, action: 'resolve' | 'escalate' }
 */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase, user, profile } = auth as Awaited<
      ReturnType<typeof requireAdmin>
    > & {
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string; email?: string };
      profile: { role: string; email?: string };
    };

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const id = String(body.id || '');
    const action = String(body.action || 'resolve');
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');
    if (!['resolve', 'escalate'].includes(action)) {
      return badRequestResponse('action must be resolve or escalate');
    }

    const resolver = profile.email || user.email || user.id;

    if (action === 'resolve') {
      const { data, error } = await supabase
        .from('rls_audit_events')
        .update({
          resolved: true,
          resolved_by: resolver,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();

      if (error) return secureJson({ error: error.message }, 500);
      if (!data) return secureJson({ error: 'Not found' }, 404);

      await writeAuditLogServer(
        {
          user_id: user.id,
          user_email: profile.email ?? user.email,
          user_role: profile.role,
          action: 'rls_audit_resolved',
          resource: 'rls_audit_events',
          resource_id: id,
          outcome: 'success',
          details: {},
        },
        supabase,
      );

      return secureJson({ data });
    }

    // escalate — bump risk to critical + flag in details
    const { data: existing } = await supabase
      .from('rls_audit_events')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (!existing) return secureJson({ error: 'Not found' }, 404);

    const details = {
      ...((existing.details as Record<string, unknown>) || {}),
      escalated: true,
      escalated_by: resolver,
      escalated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('rls_audit_events')
      .update({
        risk_level: 'critical',
        details,
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return secureJson({ error: error.message }, 500);

    // Best-effort security_events mirror
    await supabase.from('security_events').insert({
      event_type: 'suspicious_pattern',
      ip_address: existing.ip_address,
      user_id: existing.user_id,
      user_email: existing.user_email,
      severity: 'critical',
      description: `RLS escalate: ${existing.event_type} on ${existing.table_name}`,
      details: { rls_audit_id: id, ...details },
    });

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'rls_audit_escalated',
        resource: 'rls_audit_events',
        resource_id: id,
        outcome: 'success',
        details: {},
      },
      supabase,
    );

    return secureJson({ data });
  } catch {
    return serverErrorResponse();
  }
}
