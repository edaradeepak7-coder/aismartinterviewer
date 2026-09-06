import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/admin/stats
 * Returns aggregated platform statistics for the admin dashboard.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return forbiddenResponse('Admin access required');
    }

    // Parallel fetch all counts
    const [
      candidatesResult,
      interviewsResult,
      interviewDataResult,
      offersResult,
      postingsResult,
      feedbackResult,
    ] = await Promise.all([
      supabase.from('candidates').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('*', { count: 'exact', head: true }),
      supabase.from('interviews').select('status, overall_score'),
      supabase.from('job_offers').select('*', { count: 'exact', head: true }),
      supabase.from('job_postings').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('recruiter_feedback').select('*', { count: 'exact', head: true }),
    ]);

    const totalCandidates = candidatesResult.count;
    const totalInterviews = interviewsResult.count;
    const interviewData = interviewDataResult.data;
    const totalOffers = offersResult.count;
    const activePostings = postingsResult.count;
    const pendingFeedback = feedbackResult.count;

    const interviews = interviewData || [];
    const completed = interviews.filter((i: any) => ['completed', 'evaluated'].includes(i.status)).length;
    const scored = interviews.filter((i: any) => i.overall_score !== null);
    const avgScore = scored.length
      ? Math.round(scored.reduce((s: number, i: any) => s + (i.overall_score ?? 0), 0) / scored.length)
      : 0;
    const completionRate = (totalInterviews || 0) > 0
      ? Math.round((completed / (totalInterviews || 1)) * 100)
      : 0;

    return secureJson({
      data: {
        totalCandidates: totalCandidates || 0,
        totalInterviews: totalInterviews || 0,
        completedInterviews: completed,
        completionRate,
        avgScore,
        totalOffers: totalOffers || 0,
        activePostings: activePostings || 0,
        pendingFeedback: pendingFeedback || 0,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
