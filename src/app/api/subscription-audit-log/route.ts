import { NextRequest } from 'next/server';
import { sanitizeString } from '@/lib/security/sanitize';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

type EventType =
  | 'upgrade'
  | 'downgrade'
  | 'credit_added'
  | 'invoice_generated'
  | 'payment'
  | 'cancellation'
  | 'renewal'
  | 'trial_started';

function mapAlertType(alertType: string): EventType {
  const t = alertType.toLowerCase();
  if (t.includes('upgrade')) return 'upgrade';
  if (t.includes('downgrade')) return 'downgrade';
  if (t.includes('credit')) return 'credit_added';
  if (t.includes('invoice')) return 'invoice_generated';
  if (t.includes('cancel')) return 'cancellation';
  if (t.includes('renew')) return 'renewal';
  if (t.includes('trial')) return 'trial_started';
  if (t.includes('payment') || t.includes('paid')) return 'payment';
  return 'payment';
}

function mapAuditAction(action: string, resource: string): EventType {
  const a = `${action} ${resource}`.toLowerCase();
  if (a.includes('upgrade')) return 'upgrade';
  if (a.includes('downgrade')) return 'downgrade';
  if (a.includes('credit')) return 'credit_added';
  if (a.includes('invoice')) return 'invoice_generated';
  if (a.includes('cancel')) return 'cancellation';
  if (a.includes('renew')) return 'renewal';
  if (a.includes('trial')) return 'trial_started';
  return 'payment';
}

/**
 * GET /api/subscription-audit-log
 * Merges subscription_email_alerts + audit_logs related to subscriptions/billing.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const limit = Math.min(
      200,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100),
    );
    const q = sanitizeString(request.nextUrl.searchParams.get('q') || '').slice(0, 100);

    const db = createServiceRoleClient();

    const [{ data: alerts }, { data: logs }] = await Promise.all([
      db
        .from('subscription_email_alerts')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(limit),
      db
        .from('audit_logs')
        .select('*')
        .or(
          'resource.ilike.%subscription%,resource.ilike.%billing%,resource.ilike.%credit%,action.ilike.%subscription%,action.ilike.%payment%,action.ilike.%credit%',
        )
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    const userIds = [
      ...new Set([
        ...(alerts || []).map((a) => a.user_id).filter(Boolean),
        ...(logs || []).map((l) => l.user_id).filter(Boolean),
      ]),
    ];

    const { data: profiles } = userIds.length
      ? await db.from('user_profiles').select('id, email').in('id', userIds)
      : { data: [] as { id: string; email: string }[] };
    const emailMap = new Map((profiles || []).map((p) => [p.id, p.email]));

    const fromAlerts = (alerts || []).map((a) => {
      const meta = (a.metadata as Record<string, unknown>) || {};
      return {
        id: `alert-${a.id}`,
        occurred_at: a.sent_at || a.created_at || new Date().toISOString(),
        event_type: mapAlertType(String(a.alert_type || '')),
        actor_email: String(meta.triggered_by || 'system@platform.com'),
        actor_role: 'system',
        target_user_email: emailMap.get(a.user_id) || String(meta.user_email || '—'),
        target_user_id: a.user_id,
        ip_address: (meta.ip_address as string) || null,
        reason: (meta.reason as string) || String(a.alert_type || null),
        before_state: (meta.before_state as Record<string, unknown>) || null,
        after_state: (meta.after_state as Record<string, unknown>) || null,
        amount_inr: typeof meta.amount_inr === 'number' ? meta.amount_inr : null,
        plan_from: (meta.plan_from as string) || null,
        plan_to: (meta.plan_to as string) || null,
        credits_delta: typeof meta.credits_delta === 'number' ? meta.credits_delta : null,
        invoice_number: (meta.invoice_number as string) || null,
        payment_id: (meta.payment_id as string) || null,
        metadata: meta,
        source: 'subscription_email_alerts',
      };
    });

    const fromLogs = (logs || []).map((l) => {
      const details = (l.details as Record<string, unknown>) || {};
      return {
        id: `log-${l.id}`,
        occurred_at: l.created_at,
        event_type: mapAuditAction(String(l.action || ''), String(l.resource || '')),
        actor_email: l.user_email || '—',
        actor_role: l.user_role || 'unknown',
        target_user_email:
          String(details.target_user_email || emailMap.get(l.user_id) || l.user_email || '—'),
        target_user_id: String(details.target_user_id || l.user_id || ''),
        ip_address: l.ip_address || null,
        reason: String(details.reason || l.action || ''),
        before_state: (details.before_state as Record<string, unknown>) || null,
        after_state: (details.after_state as Record<string, unknown>) || null,
        amount_inr: typeof details.amount_inr === 'number' ? details.amount_inr : null,
        plan_from: (details.plan_from as string) || (details.previous_plan as string) || null,
        plan_to: (details.plan_to as string) || (details.new_plan as string) || null,
        credits_delta: typeof details.credits_delta === 'number' ? details.credits_delta : null,
        invoice_number: (details.invoice_number as string) || null,
        payment_id: (details.payment_id as string) || null,
        metadata: details,
        source: 'audit_logs',
      };
    });

    let entries = [...fromAlerts, ...fromLogs].sort(
      (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime(),
    );

    if (q) {
      const lower = q.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.target_user_email.toLowerCase().includes(lower) ||
          e.actor_email.toLowerCase().includes(lower) ||
          String(e.reason || '')
            .toLowerCase()
            .includes(lower) ||
          String(e.invoice_number || '')
            .toLowerCase()
            .includes(lower) ||
          String(e.payment_id || '')
            .toLowerCase()
            .includes(lower),
      );
    }

    entries = entries.slice(0, limit);

    return secureJson({ data: entries, total: entries.length });
  } catch {
    return serverErrorResponse();
  }
}
