import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/automation-monitor
 * Job execution history from background_jobs + job_execution_log.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const limit = Math.min(
      100,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '50', 10) || 50),
    );

    const db = createServiceRoleClient();
    const [{ data: jobs, error: jobsErr }, { data: logs, error: logsErr }] = await Promise.all([
      db
        .from('background_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
      db
        .from('job_execution_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit),
    ]);

    if (jobsErr) return secureJson({ error: jobsErr.message }, 500);
    if (logsErr) return secureJson({ error: logsErr.message }, 500);

    const jobList = jobs || [];
    const completed = jobList.filter((j) => j.status === 'completed').length;
    const failed = jobList.filter((j) => j.status === 'failed').length;
    const running = jobList.filter((j) => j.status === 'running' || j.status === 'retrying').length;
    const pending = jobList.filter((j) => j.status === 'pending').length;

    const history = jobList.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      error_message: j.error_message,
      retry_count: j.retry_count,
      max_retries: j.max_retries,
      scheduled_at: j.scheduled_at,
      started_at: j.started_at,
      completed_at: j.completed_at,
      created_at: j.created_at,
      duration_ms:
        j.started_at && j.completed_at
          ? new Date(j.completed_at).getTime() - new Date(j.started_at).getTime()
          : null,
      payload_summary: j.payload,
    }));

    return secureJson({
      data: {
        jobs: history,
        execution_log: logs || [],
      },
      kpis: {
        total: jobList.length,
        completed,
        failed,
        running,
        pending,
        pass_rate:
          completed + failed > 0
            ? Math.round((completed / (completed + failed)) * 100)
            : null,
      },
    });
  } catch {
    return serverErrorResponse();
  }
}
