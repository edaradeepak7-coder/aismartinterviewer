import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/security/apiHelpers';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

export type RecruiterAnalyticsPayload = {
  completionRateByRole: { role: string; total: number; completed: number; rate: number }[];
  avgScoreByRole: { role: string; avgScore: number; count: number }[];
  timeToHireTrend: { week: string; avgDays: number; hires: number }[];
  scoreDistribution: { range: string; count: number; fill: string }[];
  kpis: {
    totalInterviews: number;
    completionRate: number;
    avgScore: number;
    avgTimeToHire: number;
    topPerformers: number;
    hireRate: number;
    offersSent: number;
    offersAccepted: number;
  };
  empty: boolean;
  rangeDays: number;
};

function emptyPayload(rangeDays: number): RecruiterAnalyticsPayload {
  return {
    completionRateByRole: [],
    avgScoreByRole: [],
    timeToHireTrend: [],
    scoreDistribution: [
      { range: '0–40', count: 0, fill: '#EF4444' },
      { range: '41–60', count: 0, fill: '#F59E0B' },
      { range: '61–75', count: 0, fill: '#3B82F6' },
      { range: '76–90', count: 0, fill: '#0D9488' },
      { range: '91–100', count: 0, fill: '#8B5CF6' },
    ],
    kpis: {
      totalInterviews: 0,
      completionRate: 0,
      avgScore: 0,
      avgTimeToHire: 0,
      topPerformers: 0,
      hireRate: 0,
      offersSent: 0,
      offersAccepted: 0,
    },
    empty: true,
    rangeDays,
  };
}

/**
 * GET /api/recruiter-analytics?range=7d|30d|90d|365d
 * Scoped to the signed-in recruiter's interviews + job_offers.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !RECRUITER_ROLES.has(profile.role)) return forbiddenResponse();

    const range = request.nextUrl.searchParams.get('range') || '30d';
    const allowed = new Set(['7d', '30d', '90d', '365d']);
    if (!allowed.has(range)) return badRequestResponse('Invalid range');

    const rangeDays =
      range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();

    const isAdmin = ['admin', 'super_admin'].includes(profile.role);

    let interviewsQuery = supabase
      .from('interviews')
      .select(
        'id, role, status, overall_score, scheduled_at, completed_at, created_at, recruiter_id',
      )
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(2000);

    if (!isAdmin) {
      interviewsQuery = interviewsQuery.eq('recruiter_id', user.id);
    }

    let offersQuery = supabase
      .from('job_offers')
      .select('id, interview_id, status, created_at, responded_at, recruiter_id')
      .gte('created_at', since)
      .limit(2000);

    if (!isAdmin) {
      offersQuery = offersQuery.eq('recruiter_id', user.id);
    }

    const [ivRes, offerRes] = await Promise.all([interviewsQuery, offersQuery]);

    if (ivRes.error) {
      return secureJson({ error: ivRes.error.message }, 500);
    }
    if (offerRes.error && !/job_offers|PGRST/i.test(offerRes.error.message)) {
      return secureJson({ error: offerRes.error.message }, 500);
    }

    const interviews = ivRes.data || [];
    const offers = offerRes.data || [];

    if (interviews.length === 0 && offers.length === 0) {
      return secureJson({ data: emptyPayload(rangeDays) });
    }

    const roleMap: Record<
      string,
      { total: number; completed: number; scores: number[] }
    > = {};

    interviews.forEach((iv) => {
      const role = (iv.role || 'Other').trim() || 'Other';
      if (!roleMap[role]) roleMap[role] = { total: 0, completed: 0, scores: [] };
      roleMap[role].total++;
      if (iv.status === 'completed' || iv.status === 'evaluated') {
        roleMap[role].completed++;
        if (typeof iv.overall_score === 'number' && iv.overall_score > 0) {
          roleMap[role].scores.push(iv.overall_score);
        }
      }
    });

    const truncate = (r: string) => (r.length > 14 ? `${r.slice(0, 14)}…` : r);

    const completionRateByRole = Object.entries(roleMap)
      .map(([role, d]) => ({
        role: truncate(role),
        total: d.total,
        completed: d.completed,
        rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);

    const avgScoreByRole = Object.entries(roleMap)
      .filter(([, d]) => d.scores.length > 0)
      .map(([role, d]) => ({
        role: truncate(role),
        avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length),
        count: d.scores.length,
      }))
      .sort((a, b) => b.avgScore - a.avgScore)
      .slice(0, 7);

    // Time-to-hire: interview → accepted offer.responded_at
    const interviewById = new Map(interviews.map((iv) => [iv.id, iv]));
    const hireDays: { weekKey: string; days: number }[] = [];

    offers
      .filter((o) => o.status === 'accepted' && o.responded_at)
      .forEach((o) => {
        const iv = o.interview_id ? interviewById.get(o.interview_id) : null;
        const startIso = iv?.created_at || iv?.completed_at || o.created_at;
        if (!startIso || !o.responded_at) return;
        const days =
          (new Date(o.responded_at).getTime() - new Date(startIso).getTime()) /
          (1000 * 60 * 60 * 24);
        if (days < 0 || days > 365) return;
        const weeksAgo = Math.floor(
          (Date.now() - new Date(o.responded_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
        );
        const weekNum = Math.max(1, Math.min(8, 8 - weeksAgo));
        hireDays.push({ weekKey: `W${weekNum}`, days });
      });

    const weekMap: Record<string, { days: number[]; hires: number }> = {};
    hireDays.forEach(({ weekKey, days }) => {
      if (!weekMap[weekKey]) weekMap[weekKey] = { days: [], hires: 0 };
      weekMap[weekKey].days.push(days);
      weekMap[weekKey].hires++;
    });

    const timeToHireTrend = Object.entries(weekMap)
      .map(([week, d]) => ({
        week,
        avgDays:
          d.days.length > 0
            ? Math.round(d.days.reduce((a, b) => a + b, 0) / d.days.length)
            : 0,
        hires: d.hires,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));

    const allScores = interviews
      .map((iv) => iv.overall_score)
      .filter((s): s is number => typeof s === 'number' && s > 0);

    const scoreDistribution = [
      { range: '0–40', count: allScores.filter((s) => s <= 40).length, fill: '#EF4444' },
      {
        range: '41–60',
        count: allScores.filter((s) => s > 40 && s <= 60).length,
        fill: '#F59E0B',
      },
      {
        range: '61–75',
        count: allScores.filter((s) => s > 60 && s <= 75).length,
        fill: '#3B82F6',
      },
      {
        range: '76–90',
        count: allScores.filter((s) => s > 75 && s <= 90).length,
        fill: '#0D9488',
      },
      { range: '91–100', count: allScores.filter((s) => s > 90).length, fill: '#8B5CF6' },
    ];

    const completed = interviews.filter(
      (iv) => iv.status === 'completed' || iv.status === 'evaluated',
    );
    const offersSent = offers.length;
    const offersAccepted = offers.filter((o) => o.status === 'accepted').length;
    const hireRate =
      offersSent > 0 ? Math.round((offersAccepted / offersSent) * 100) : 0;

    const allHireDays = hireDays.map((h) => h.days);
    const avgTimeToHire =
      allHireDays.length > 0
        ? Math.round(allHireDays.reduce((a, b) => a + b, 0) / allHireDays.length)
        : 0;

    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0;

    const payload: RecruiterAnalyticsPayload = {
      completionRateByRole,
      avgScoreByRole,
      timeToHireTrend,
      scoreDistribution,
      kpis: {
        totalInterviews: interviews.length,
        completionRate:
          interviews.length > 0
            ? Math.round((completed.length / interviews.length) * 100)
            : 0,
        avgScore,
        avgTimeToHire,
        topPerformers: allScores.filter((s) => s >= 80).length,
        hireRate,
        offersSent,
        offersAccepted,
      },
      empty: interviews.length === 0 && offers.length === 0,
      rangeDays,
    };

    return secureJson({ data: payload });
  } catch (err) {
    console.error('recruiter-analytics GET:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
