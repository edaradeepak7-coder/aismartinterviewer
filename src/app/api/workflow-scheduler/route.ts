import { NextRequest } from 'next/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { enqueueJob, JobType } from '@/lib/services/backgroundJobService';
import { writeAuditLogServer } from '@/lib/security/auditLog';

const ALLOWED_TYPES: JobType[] = [
  'ai_evaluation',
  'bulk_export',
  'report_generation',
  'renewal_reminder',
  'overage_check',
  'payment_retry',
];

function relativeTime(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function nextRunLabel(scheduledAt: string | null, paused: boolean): string {
  if (paused) return 'Paused';
  if (!scheduledAt) return '—';
  const diff = new Date(scheduledAt).getTime() - Date.now();
  if (diff <= 0) return 'due now';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `in ${hours}h`;
  return `in ${Math.floor(hours / 24)}d`;
}

function mapWorkflow(job: Record<string, unknown>) {
  const payload = (job.payload as Record<string, unknown>) || {};
  const paused = Boolean(payload.paused) || job.status === 'cancelled';
  const status =
    job.status === 'failed' ? 'error' : paused ? 'paused' : 'active';

  return {
    id: String(job.id),
    name: String(payload.name || job.type),
    description: String(payload.description || ''),
    cron: String(payload.cron || '0 0 * * *'),
    cronLabel: String(payload.cronLabel || payload.cron_label || 'Custom schedule'),
    status,
    lastRun: relativeTime(
      (payload.last_run_at as string) || (job.completed_at as string) || (job.started_at as string),
    ),
    nextRun: nextRunLabel(job.scheduled_at as string, paused),
    runCount: Number(payload.run_count ?? 0),
    failCount: Number(payload.fail_count ?? (job.status === 'failed' ? 1 : 0)),
    avgDurationMs: Number(payload.avg_duration_ms ?? 0),
    hooks: Array.isArray(payload.hooks) ? payload.hooks : [],
    category: String(payload.category || 'report'),
    type: job.type,
    scheduled_at: job.scheduled_at,
    rawStatus: job.status,
  };
}

/**
 * GET /api/workflow-scheduler — scheduled background_jobs marked as workflows
 */
export async function GET() {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('background_jobs')
      .select('*')
      .order('scheduled_at', { ascending: true })
      .limit(200);

    if (error) return secureJson({ error: error.message }, 500);

    const workflows = (data || [])
      .filter((j) => {
        const p = (j.payload as Record<string, unknown>) || {};
        return p.is_scheduled_workflow === true;
      })
      .map((j) => mapWorkflow(j as Record<string, unknown>));

    return secureJson({
      data: workflows,
      kpis: {
        active: workflows.filter((w) => w.status === 'active').length,
        paused: workflows.filter((w) => w.status === 'paused').length,
        error: workflows.filter((w) => w.status === 'error').length,
        totalRuns: workflows.reduce((s, w) => s + w.runCount, 0),
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
    if (!name) return badRequestResponse('name required');

    const jobType = (ALLOWED_TYPES.includes(body.type as JobType)
      ? body.type
      : 'report_generation') as JobType;

    const cron = sanitizeString(String(body.cron || '0 0 * * *')).slice(0, 40);
    const cronLabel = sanitizeString(String(body.cronLabel || body.cron_label || cron)).slice(
      0,
      80,
    );
    const scheduledAt = body.scheduled_at
      ? new Date(String(body.scheduled_at))
      : new Date(Date.now() + 3600_000);

    const job = await enqueueJob(user.id, {
      type: jobType,
      payload: {
        is_scheduled_workflow: true,
        name,
        description: sanitizeString(String(body.description || '')).slice(0, 500),
        cron,
        cronLabel,
        category: sanitizeString(String(body.category || 'report')).slice(0, 40),
        hooks: Array.isArray(body.hooks) ? body.hooks : [],
        run_count: 0,
        fail_count: 0,
        paused: false,
      },
      priority: 5,
      maxRetries: 3,
      scheduledAt,
    });

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'workflow_scheduler_created',
        resource: 'background_jobs',
        resource_id: job.id,
        outcome: 'success',
        details: { name, cron },
      },
      auth.supabase,
    );

    return secureJson({ data: mapWorkflow(job as unknown as Record<string, unknown>) }, 201);
  } catch {
    return serverErrorResponse();
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const id = String(body.id || '');
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const db = createServiceRoleClient();
    const { data: job, error: fetchErr } = await db
      .from('background_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (fetchErr) return secureJson({ error: fetchErr.message }, 500);
    if (!job) return secureJson({ error: 'Not found' }, 404);

    const payload = { ...((job.payload as Record<string, unknown>) || {}) };
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.action === 'pause') {
      payload.paused = true;
      updates.status = 'cancelled';
    } else if (body.action === 'resume') {
      payload.paused = false;
      updates.status = 'pending';
      updates.scheduled_at = body.scheduled_at || new Date(Date.now() + 3600_000).toISOString();
    } else if (body.action === 'update') {
      if (body.name !== undefined) payload.name = sanitizeString(String(body.name)).slice(0, 120);
      if (body.description !== undefined) {
        payload.description = sanitizeString(String(body.description)).slice(0, 500);
      }
      if (body.cron !== undefined) payload.cron = sanitizeString(String(body.cron)).slice(0, 40);
      if (body.cronLabel !== undefined) {
        payload.cronLabel = sanitizeString(String(body.cronLabel)).slice(0, 80);
      }
      if (Array.isArray(body.hooks)) payload.hooks = body.hooks;
      if (body.scheduled_at) updates.scheduled_at = new Date(String(body.scheduled_at)).toISOString();
    }

    updates.payload = payload;

    const { data, error } = await db
      .from('background_jobs')
      .update(updates)
      .eq('id', id)
      .select('*')
      .maybeSingle();

    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data: mapWorkflow(data as Record<string, unknown>) });
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
    const { error } = await db.from('background_jobs').delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: profile.email ?? user.email,
        user_role: profile.role,
        action: 'workflow_scheduler_deleted',
        resource: 'background_jobs',
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
