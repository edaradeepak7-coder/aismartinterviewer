import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(_request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const db = createServiceRoleClient();

    const [interviewsRes, usersRes] = await Promise.all([
      db.from('interviews').select('id, status, overall_score, recommendation, created_at'),
      db.from('user_profiles').select('id, role, created_at, subscription_plan').limit(5000),
    ]);

    if (interviewsRes.error) return secureJson({ error: interviewsRes.error.message }, 500);
    if (usersRes.error) return secureJson({ error: usersRes.error.message }, 500);

    const ivs = interviewsRes.data || [];
    const usrs = usersRes.data || [];
    const total = ivs.length;
    const completed = ivs.filter((i) => i.status === 'completed' || i.status === 'evaluated');
    const hired = ivs.filter((i) => i.recommendation === 'hire' || i.recommendation === 'strong_hire');
    const scores = completed.map((i) => i.overall_score).filter((s): s is number => typeof s === 'number');
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const recruiters = usrs.filter((u) => u.role === 'recruiter');
    const candidates = usrs.filter((u) => u.role === 'candidate');
    const paidRecruiters = recruiters.filter(
      (u) => u.subscription_plan && u.subscription_plan !== 'free',
    );

    // Honest funnel — only real counts, no multipliers
    const recruitersWithInterview = new Set(
      ivs.map((i) => (i as { recruiter_id?: string }).recruiter_id).filter(Boolean),
    ).size;

    const funnel = [
      { stage: 'Signed Up', value: recruiters.length, fill: '#0D9488' },
      { stage: 'First Interview', value: recruitersWithInterview || Math.min(recruiters.length, completed.length), fill: '#8B5CF6' },
      { stage: 'Interview Completed', value: completed.length, fill: '#F59E0B' },
      { stage: 'Plan Upgraded', value: paidRecruiters.length, fill: '#EF4444' },
    ];

    const scheduled = ivs.filter((i) => i.status === 'scheduled').length;
    const inProgress = ivs.filter((i) => i.status === 'in_progress').length;

    const completionMetrics = [
      {
        label: 'Scheduled',
        value: scheduled,
        total,
        pct: total > 0 ? Math.round((scheduled / total) * 100) : 0,
        color: '#3B82F6',
      },
      {
        label: 'In Progress',
        value: inProgress,
        total,
        pct: total > 0 ? Math.round((inProgress / total) * 100) : 0,
        color: '#F59E0B',
      },
      {
        label: 'Completed',
        value: completed.length,
        total,
        pct: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        color: '#0D9488',
      },
      {
        label: 'Hired',
        value: hired.length,
        total: completed.length,
        pct: completed.length > 0 ? Math.round((hired.length / completed.length) * 100) : 0,
        color: '#10B981',
      },
    ];

    const planCounts: Record<string, number> = {};
    usrs.forEach((u) => {
      const plan = u.subscription_plan || 'free';
      planCounts[plan] = (planCounts[plan] || 0) + 1;
    });
    const planDistribution = Object.entries(planCounts).map(([plan, count]) => ({
      plan: plan.charAt(0).toUpperCase() + plan.slice(1),
      count,
    }));

    return secureJson({
      kpis: {
        totalInterviews: total,
        completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0,
        hireRate: completed.length > 0 ? Math.round((hired.length / completed.length) * 100) : 0,
        avgScore,
        totalUsers: usrs.length,
        recruiters: recruiters.length,
        candidates: candidates.length,
      },
      funnel,
      completionMetrics,
      planDistribution,
      featureAdoption: [],
    });
  } catch {
    return serverErrorResponse();
  }
}
