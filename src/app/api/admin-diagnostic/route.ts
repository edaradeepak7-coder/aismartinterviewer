import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();

    const [auditRes, profilesRes, jobsRes, interviewsCount] = await Promise.all([
      db
        .from('audit_logs')
        .select('id, action, outcome, user_id, created_at, ip_address')
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('user_profiles').select('id, role, email, created_at').limit(5000),
      db
        .from('background_jobs')
        .select('id, type, status, created_at, started_at, completed_at, error_message')
        .order('created_at', { ascending: false })
        .limit(50),
      db.from('interviews').select('id', { count: 'exact', head: true }),
    ]);

    const profiles = profilesRes.data || [];
    const roleCounts: Record<string, number> = {};
    profiles.forEach((p) => {
      roleCounts[p.role || 'unknown'] = (roleCounts[p.role || 'unknown'] || 0) + 1;
    });

    const jobs = jobsRes.data || [];
    const jobStatusCounts: Record<string, number> = {};
    jobs.forEach((j) => {
      jobStatusCounts[j.status || 'unknown'] = (jobStatusCounts[j.status || 'unknown'] || 0) + 1;
    });

    return secureJson({
      auditLogs: auditRes.data || [],
      auditError: auditRes.error?.message || null,
      profiles: {
        total: profiles.length,
        byRole: roleCounts,
        recent: profiles
          .slice()
          .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
          .slice(0, 20),
      },
      backgroundJobs: {
        recent: jobs,
        byStatus: jobStatusCounts,
        error: jobsRes.error?.message || null,
      },
      counts: {
        interviews: interviewsCount.count ?? 0,
        users: profiles.length,
        auditLogs: (auditRes.data || []).length,
        jobs: jobs.length,
      },
      checked_at: new Date().toISOString(),
    });
  } catch {
    return serverErrorResponse();
  }
}
