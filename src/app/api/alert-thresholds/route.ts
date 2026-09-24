import { NextRequest } from 'next/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { writeAuditLogServer } from '@/lib/security/auditLog';
import { createServiceRoleClient } from '@/lib/supabase/server';

const CATEGORIES = new Set([
  'connectivity',
  'performance',
  'automation',
  'security',
  'realtime',
]);

function mapRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    metric_key: row.metric_key,
    warn_value: Number(row.warn_value),
    critical_value: Number(row.critical_value),
    unit: row.unit || 'ms',
    enabled: Boolean(row.enabled),
    notify_email: Boolean(row.notify_email),
    notify_sms: Boolean(row.notify_sms),
    notify_slack: Boolean((row as { notify_slack?: boolean }).notify_slack ?? false),
    email_recipients: (row.email_recipients as string[]) || [],
    sms_recipients: (row.sms_recipients as string[]) || [],
    slack_webhook_url: String((row as { slack_webhook_url?: string }).slack_webhook_url || ''),
    cooldown_minutes: Number(row.cooldown_minutes ?? 15),
    last_triggered: row.last_triggered_at
      ? new Date(String(row.last_triggered_at)).toLocaleString('en-IN')
      : undefined,
    lower_is_bad: Boolean((row as { lower_is_bad?: boolean }).lower_is_bad ?? false),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const category = request.nextUrl.searchParams.get('category');
    const db = createServiceRoleClient();

    let query = db.from('alert_thresholds').select('*').order('category').order('name');
    if (category && category !== 'all') {
      if (!CATEGORIES.has(category)) return badRequestResponse('Invalid category');
      query = query.eq('category', category);
    }

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    const rows = (data || []).map((r) => mapRow(r as Record<string, unknown>));
    return secureJson({
      data: rows,
      kpis: {
        total: rows.length,
        enabled: rows.filter((r) => r.enabled).length,
        email: rows.filter((r) => r.notify_email).length,
        slack: rows.filter((r) => r.notify_slack).length,
      },
    });
  } catch {
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;
    const { user, profile } = auth;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const name = sanitizeString(String(body.name || '')).slice(0, 120);
    const category = String(body.category || '');
    const metric_key = sanitizeString(String(body.metric_key || '')).slice(0, 120);
    if (!name || !metric_key) return badRequestResponse('name and metric_key required');
    if (!CATEGORIES.has(category)) return badRequestResponse('Invalid category');

    const db = createServiceRoleClient();
    const row: Record<string, unknown> = {
      name,
      category,
      metric_key,
      warn_value: Number(body.warn_value ?? 0),
      critical_value: Number(body.critical_value ?? 0),
      unit: sanitizeString(String(body.unit || 'ms')).slice(0, 20),
      enabled: body.enabled !== false,
      notify_email: Boolean(body.notify_email ?? true),
      notify_sms: Boolean(body.notify_sms ?? false),
      email_recipients: Array.isArray(body.email_recipients)
        ? body.email_recipients.map((e) => sanitizeString(String(e)).slice(0, 254))
        : [],
      sms_recipients: Array.isArray(body.sms_recipients)
        ? body.sms_recipients.map((e) => sanitizeString(String(e)).slice(0, 40))
        : [],
      cooldown_minutes: Math.max(1, Number(body.cooldown_minutes ?? 15)),
      created_by: user.id,
    };

    if (body.notify_slack !== undefined) {
      row.notify_slack = Boolean(body.notify_slack);
    }
    if (body.slack_webhook_url !== undefined) {
      row.slack_webhook_url = sanitizeString(String(body.slack_webhook_url || '')).slice(0, 500) || null;
    }
    if (body.lower_is_bad !== undefined) {
      row.lower_is_bad = Boolean(body.lower_is_bad);
    }

    let { data, error } = await db.from('alert_thresholds').insert(row).select('*').single();

    // Retry without Slack columns if migration not yet applied
    if (error && (error.message?.includes('notify_slack') || error.message?.includes('slack_webhook_url') || error.message?.includes('lower_is_bad'))) {
      const { notify_slack: _ns, slack_webhook_url: _sw, lower_is_bad: _lb, ...fallback } = row;
      ({ data, error } = await db.from('alert_thresholds').insert(fallback).select('*').single());
    }
    if (error) return secureJson({ error: error.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'alert_threshold_created',
        resource: 'alert_thresholds',
        resource_id: data.id,
        outcome: 'success',
        details: { metric_key, category },
      },
      auth.supabase,
    );

    return secureJson({ data: mapRow(data as Record<string, unknown>) }, 201);
  } catch {
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;
    const { user, profile } = auth;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const id = String(body.id || '');
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (body.name !== undefined) updates.name = sanitizeString(String(body.name)).slice(0, 120);
    if (body.warn_value !== undefined) updates.warn_value = Number(body.warn_value);
    if (body.critical_value !== undefined) updates.critical_value = Number(body.critical_value);
    if (body.enabled !== undefined) updates.enabled = Boolean(body.enabled);
    if (body.notify_email !== undefined) updates.notify_email = Boolean(body.notify_email);
    if (body.notify_sms !== undefined) updates.notify_sms = Boolean(body.notify_sms);
    if (body.notify_slack !== undefined) updates.notify_slack = Boolean(body.notify_slack);
    if (body.slack_webhook_url !== undefined) {
      updates.slack_webhook_url = sanitizeString(String(body.slack_webhook_url || '')).slice(0, 500) || null;
    }
    if (body.cooldown_minutes !== undefined) {
      updates.cooldown_minutes = Math.max(1, Number(body.cooldown_minutes));
    }
    if (Array.isArray(body.email_recipients)) {
      updates.email_recipients = body.email_recipients.map((e) =>
        sanitizeString(String(e)).slice(0, 254),
      );
    }
    if (Array.isArray(body.sms_recipients)) {
      updates.sms_recipients = body.sms_recipients.map((e) =>
        sanitizeString(String(e)).slice(0, 40),
      );
    }
    if (body.unit !== undefined) {
      updates.unit = sanitizeString(String(body.unit)).slice(0, 20);
    }
    if (body.category !== undefined) {
      if (!CATEGORIES.has(String(body.category))) return badRequestResponse('Invalid category');
      updates.category = String(body.category);
    }
    if (body.lower_is_bad !== undefined) updates.lower_is_bad = Boolean(body.lower_is_bad);

    const db = createServiceRoleClient();
    let { data, error } = await db
      .from('alert_thresholds')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    // Retry without Slack columns if migration not yet applied
    if (error && (error.message?.includes('notify_slack') || error.message?.includes('slack_webhook_url') || error.message?.includes('lower_is_bad'))) {
      const { notify_slack: _ns, slack_webhook_url: _sw, lower_is_bad: _lb, ...fallback } = updates;
      ({ data, error } = await db
        .from('alert_thresholds')
        .update(fallback)
        .eq('id', id)
        .select('*')
        .maybeSingle());
    }

    if (error) return secureJson({ error: error.message }, 500);
    if (!data) return secureJson({ error: 'Not found' }, 404);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'alert_threshold_updated',
        resource: 'alert_thresholds',
        resource_id: id,
        outcome: 'success',
        details: { fields: Object.keys(updates) },
      },
      auth.supabase,
    );

    return secureJson({ data: mapRow(data as Record<string, unknown>) });
  } catch {
    return serverErrorResponse();
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;
    const { user, profile } = auth;

    const id = request.nextUrl.searchParams.get('id') || '';
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const db = createServiceRoleClient();
    const { error } = await db.from('alert_thresholds').delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'alert_threshold_deleted',
        resource: 'alert_thresholds',
        resource_id: id,
        outcome: 'success',
        details: {},
      },
      auth.supabase,
    );

    return secureJson({ success: true });
  } catch {
    return serverErrorResponse();
  }
}
