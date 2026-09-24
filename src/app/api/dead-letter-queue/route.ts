import { NextRequest } from 'next/server';
import { isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  badRequestResponse,
  serverErrorResponse,
} from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { enqueueJob, JobType } from '@/lib/services/backgroundJobService';
import { writeAuditLogServer } from '@/lib/security/auditLog';

function mapJob(job: Record<string, unknown>) {
  const payload = (job.payload as Record<string, unknown>) || {};
  const quarantined = Boolean(payload.quarantined);
  const status = quarantined
    ? 'quarantined'
    : job.status === 'retrying'
      ? 'retrying'
      : job.status === 'cancelled' || job.status === 'completed'
        ? 'resolved'
        : 'failed';

  const context: Record<string, string> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (k === 'quarantined' || k === 'is_scheduled_workflow') continue;
    if (v !== null && v !== undefined && typeof v !== 'object') {
      context[k] = String(v);
    }
  }

  return {
    id: String(job.id),
    workflowName: String(payload.name || payload.workflow_name || job.type || 'Background job'),
    type: String(job.type),
    status,
    errorCode: String(payload.error_code || 'JOB_FAILED'),
    errorMessage: String(job.error_message || 'Job failed after retries'),
    failedAt: job.completed_at
      ? new Date(String(job.completed_at)).toLocaleString('en-IN')
      : job.updated_at
        ? new Date(String(job.updated_at)).toLocaleString('en-IN')
        : '—',
    retryCount: Number(job.retry_count ?? 0),
    maxRetries: Number(job.max_retries ?? 3),
    triggeredBy: String(payload.triggered_by || job.created_by || 'system'),
    context,
    canRollback: false,
    payload,
    rawStatus: job.status,
  };
}

/**
 * GET /api/dead-letter-queue — failed jobs that exhausted retries (or quarantined)
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const limit = Math.min(
      200,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100),
    );

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('background_jobs')
      .select('*')
      .in('status', ['failed', 'cancelled'])
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) return secureJson({ error: error.message }, 500);

    // Include exhausted failures + quarantined (stored as failed with payload flag)
    const items = (data || [])
      .filter((j) => {
        const payload = (j.payload as Record<string, unknown>) || {};
        if (payload.quarantined) return true;
        if (j.status === 'failed') return (j.retry_count ?? 0) >= (j.max_retries ?? 0);
        return false;
      })
      .map((j) => mapJob(j as Record<string, unknown>));

    return secureJson({
      data: items,
      kpis: {
        failed: items.filter((i) => i.status === 'failed').length,
        quarantined: items.filter((i) => i.status === 'quarantined').length,
        retrying: items.filter((i) => i.status === 'retrying').length,
        resolved: items.filter((i) => i.status === 'resolved').length,
      },
    });
  } catch {
    return serverErrorResponse();
  }
}

/**
 * POST /api/dead-letter-queue
 * body: { id, action: 'retry' | 'purge' | 'quarantine' | 'release' }
 */
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

    const id = String(body.id || '');
    const action = String(body.action || '');
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');
    if (!['retry', 'purge', 'quarantine', 'release'].includes(action)) {
      return badRequestResponse('action must be retry, purge, quarantine, or release');
    }

    const db = createServiceRoleClient();
    const { data: job, error: fetchErr } = await db
      .from('background_jobs')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchErr) return secureJson({ error: fetchErr.message }, 500);
    if (!job) return secureJson({ error: 'Not found' }, 404);

    const payload = { ...((job.payload as Record<string, unknown>) || {}) };

    if (action === 'retry') {
      const newJob = await enqueueJob(user.id, {
        type: job.type as JobType,
        payload: { ...payload, quarantined: false, retried_from: id },
        priority: job.priority ?? 5,
        maxRetries: job.max_retries ?? 3,
        tenantId: job.tenant_id ?? undefined,
      });

      // Mark original as cancelled (resolved from DLQ perspective)
      await db
        .from('background_jobs')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          payload: { ...payload, resolved_by_retry: newJob.id },
        })
        .eq('id', id);

      await writeAuditLogServer(
        {
          user_id: user.id,
          user_email: profile.email ?? user.email,
          user_role: profile.role,
          action: 'dlq_retry',
          resource: 'background_jobs',
          resource_id: id,
          outcome: 'success',
          details: { new_job_id: newJob.id },
        },
        auth.supabase,
      );

      return secureJson({ data: { original_id: id, new_job: newJob } });
    }

    if (action === 'purge') {
      const { error } = await db.from('background_jobs').delete().eq('id', id);
      if (error) return secureJson({ error: error.message }, 500);

      await writeAuditLogServer(
        {
          user_id: user.id,
          user_email: profile.email ?? user.email,
          user_role: profile.role,
          action: 'dlq_purge',
          resource: 'background_jobs',
          resource_id: id,
          outcome: 'success',
          details: {},
        },
        auth.supabase,
      );

      return secureJson({ success: true });
    }

    if (action === 'quarantine') {
      const { data, error } = await db
        .from('background_jobs')
        .update({
          payload: { ...payload, quarantined: true },
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select('*')
        .maybeSingle();
      if (error) return secureJson({ error: error.message }, 500);
      return secureJson({ data: mapJob(data as Record<string, unknown>) });
    }

    // release
    const { data, error } = await db
      .from('background_jobs')
      .update({
        payload: { ...payload, quarantined: false },
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data: mapJob(data as Record<string, unknown>) });
  } catch {
    return serverErrorResponse();
  }
}
