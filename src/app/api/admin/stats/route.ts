import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

const ADMIN_ROLES = new Set(['admin', 'super_admin']);

/**
 * GET /api/admin/stats
 * Aggregated platform statistics for admin / super-admin dashboards.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !ADMIN_ROLES.has(profile.role)) {
      return forbiddenResponse('Admin access required');
    }

    const [
      usersResult,
      candidatesResult,
      interviewsResult,
      interviewDataResult,
      offersResult,
      postingsResult,
      feedbackResult,
      institutionsResult,
      profilesByRole,
    ] = await Promise.all([
      supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('status, overall_score'),
      supabase.from('job_offers').select('*', { count: 'exact', head: true }),
      supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('recruiter_feedback').select('*', { count: 'exact', head: true }),
      supabase.from('institutions').select('*', { count: 'exact', head: true }),
      supabase.from('user_profiles').select('role').limit(5000),
    ]);

    const totalUsers = usersResult.count || 0;
    const totalCandidates = candidatesResult.count || 0;
    const totalInterviews = interviewsResult.count || 0;
    const interviewData = interviewDataResult.data || [];
    const totalOffers = offersResult.count || 0;
    const activePostings = postingsResult.count || 0;
    const pendingFeedback = feedbackResult.count || 0;
    const totalInstitutions = institutionsResult.count || 0;

    const completed = interviewData.filter((i: any) => ['completed', 'evaluated'].includes(i.status)).length;
    const inProgress = interviewData.filter((i: any) =>
      ['in_progress', 'scheduled', 'pending'].includes(i.status)
    ).length;
    const scored = interviewData.filter((i: any) => i.overall_score !== null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s: number, i: any) => s + (i.overall_score ?? 0), 0) / scored.length)
      : 0;
    const completionRate = totalInterviews > 0
      ? Math.round((completed / totalInterviews) * 100)
      : 0;

    const roleCounts: Record<string, number> = {};
    (profilesByRole.data || []).forEach((p: any) => {
      const role = p.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    const orgAdmins = (roleCounts['org_admin'] || 0) + (roleCounts['recruiter'] || 0);

    return secureJson({
      data: {
        totalUsers,
        totalCandidates,
        totalInterviews,
        completedInterviews: completed,
        activeInterviews: inProgress,
        completionRate,
        avgScore,
        totalOffers,
        activePostings,
        pendingFeedback,
        totalInstitutions,
        orgRelatedUsers: orgAdmins,
        roleCounts,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
