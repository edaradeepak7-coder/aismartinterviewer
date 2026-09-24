import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
  badRequestResponse,
} from '@/lib/security/apiHelpers';

const STAFF = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

type CompetencyRatings = Record<string, number>;

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function ratingsToPct(ratings: CompetencyRatings | null | undefined, keys: string[]): number {
  if (!ratings || typeof ratings !== 'object') return 0;
  const vals = keys
    .map((k) => Number(ratings[k]))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!vals.length) return 0;
  // Competency scale is 1–5 → percent
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 20);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { month: 'short' });
}

/**
 * GET /api/interviewer-performance?range=7d|30d|90d
 * Aggregates interviews + structured feedback by recruiter_id.
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
    if (!profile || !STAFF.has(profile.role)) return forbiddenResponse();

    const range = request.nextUrl.searchParams.get('range') || '30d';
    if (!['7d', '30d', '90d'].includes(range)) return badRequestResponse('Invalid range');
    const rangeDays = range === '7d' ? 7 : range === '30d' ? 30 : 90;
    const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000).toISOString();
    const mid = new Date(Date.now() - (rangeDays / 2) * 24 * 60 * 60 * 1000).toISOString();

    const isAdmin = ['admin', 'super_admin', 'org_admin'].includes(profile.role);

    let ivQuery = supabase
      .from('interviews')
      .select(
        'id, recruiter_id, role, status, overall_score, technical_score, communication_score, duration_minutes, created_at, completed_at',
      )
      .gte('created_at', since)
      .not('recruiter_id', 'is', null)
      .limit(3000);

    if (!isAdmin) ivQuery = ivQuery.eq('recruiter_id', user.id);

    let fbQuery = supabase
      .from('recruiter_structured_feedback')
      .select(
        'id, recruiter_id, interview_id, candidate_id, competency_ratings, overall_notes, strengths, decision, created_at',
      )
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(100);

    if (!isAdmin) fbQuery = fbQuery.eq('recruiter_id', user.id);

    const [ivRes, fbRes] = await Promise.all([ivQuery, fbQuery]);
    if (ivRes.error) return secureJson({ error: ivRes.error.message }, 500);

    const interviews = ivRes.data || [];
    const feedbackRows = fbRes.error ? [] : fbRes.data || [];

    const candidateIds = [
      ...new Set(feedbackRows.map((f) => f.candidate_id as string).filter(Boolean)),
    ];
    const interviewIds = [
      ...new Set(feedbackRows.map((f) => f.interview_id as string).filter(Boolean)),
    ];

    const candName: Record<string, string> = {};
    const ivRole: Record<string, string> = {};
    if (candidateIds.length) {
      const { data: cands } = await supabase
        .from('candidates')
        .select('id, name')
        .in('id', candidateIds);
      for (const c of cands || []) candName[c.id] = c.name || 'Candidate';
    }
    if (interviewIds.length) {
      const { data: ivs } = await supabase
        .from('interviews')
        .select('id, role')
        .in('id', interviewIds);
      for (const i of ivs || []) ivRole[i.id] = i.role || '—';
    }

    const recruiterIds = [
      ...new Set(
        [
          ...interviews.map((i) => i.recruiter_id as string),
          ...feedbackRows.map((f) => f.recruiter_id as string),
        ].filter(Boolean),
      ),
    ];

    const profileMap: Record<string, { full_name: string | null; role: string | null }> = {};
    if (recruiterIds.length) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .in('id', recruiterIds);
      for (const p of profiles || []) {
        profileMap[p.id] = { full_name: p.full_name, role: p.role };
      }
    }

    type Acc = {
      id: string;
      scores: number[];
      tech: number[];
      comm: number[];
      durations: number[];
      total: number;
      completed: number;
      earlyScores: number[];
      lateScores: number[];
      competencyBuckets: CompetencyRatings[];
    };

    const byRecruiter: Record<string, Acc> = {};

    for (const iv of interviews) {
      const rid = iv.recruiter_id as string;
      if (!rid) continue;
      if (!byRecruiter[rid]) {
        byRecruiter[rid] = {
          id: rid,
          scores: [],
          tech: [],
          comm: [],
          durations: [],
          total: 0,
          completed: 0,
          earlyScores: [],
          lateScores: [],
          competencyBuckets: [],
        };
      }
      const a = byRecruiter[rid];
      a.total += 1;
      const st = String(iv.status || '').toLowerCase();
      if (st === 'completed' || st === 'evaluated' || iv.completed_at) a.completed += 1;
      if (typeof iv.overall_score === 'number' && iv.overall_score > 0) {
        a.scores.push(iv.overall_score);
        if (iv.created_at < mid) a.earlyScores.push(iv.overall_score);
        else a.lateScores.push(iv.overall_score);
      }
      if (typeof iv.technical_score === 'number' && iv.technical_score > 0) a.tech.push(iv.technical_score);
      if (typeof iv.communication_score === 'number' && iv.communication_score > 0) {
        a.comm.push(iv.communication_score);
      }
      if (typeof iv.duration_minutes === 'number' && iv.duration_minutes > 0) {
        a.durations.push(iv.duration_minutes);
      }
    }

    for (const fb of feedbackRows) {
      const rid = fb.recruiter_id as string;
      if (!rid) continue;
      if (!byRecruiter[rid]) {
        byRecruiter[rid] = {
          id: rid,
          scores: [],
          tech: [],
          comm: [],
          durations: [],
          total: 0,
          completed: 0,
          earlyScores: [],
          lateScores: [],
          competencyBuckets: [],
        };
      }
      const ratings = fb.competency_ratings as CompetencyRatings | null;
      if (ratings && typeof ratings === 'object') {
        byRecruiter[rid].competencyBuckets.push(ratings);
      }
    }

    const interviewers = Object.values(byRecruiter).map((a) => {
      const name = profileMap[a.id]?.full_name || 'Unknown Recruiter';
      const roleLabel = (profileMap[a.id]?.role || 'recruiter').replace(/_/g, ' ');
      const avgCandidateScore = avg(a.scores);
      const completionRate = a.total ? Math.round((a.completed / a.total) * 100) : 0;
      const avgDuration = avg(a.durations) || 0;

      const fromCompQuality = avg(
        a.competencyBuckets
          .map((r) =>
            ratingsToPct(r, [
              'technical_skills',
              'communication',
              'problem_solving',
              'culture_fit',
              'leadership',
              'adaptability',
            ]),
          )
          .filter((n) => n > 0),
      );
      const fromCompEffect = avg(
        a.competencyBuckets
          .map((r) => ratingsToPct(r, ['technical_skills', 'problem_solving']))
          .filter((n) => n > 0),
      );
      const fromCompExp = avg(
        a.competencyBuckets
          .map((r) => ratingsToPct(r, ['communication', 'culture_fit']))
          .filter((n) => n > 0),
      );

      const interviewQuality = fromCompQuality || avgCandidateScore || completionRate;
      const questionEffectiveness = fromCompEffect || avg(a.tech) || avgCandidateScore;
      const candidateExperience = fromCompExp || avg(a.comm) || avgCandidateScore;

      const early = avg(a.earlyScores);
      const late = avg(a.lateScores);
      let trend: 'up' | 'down' | 'flat' = 'flat';
      let trendValue = 0;
      if (early > 0 && late > 0) {
        trendValue = Math.round((late - early) * 10) / 10;
        if (trendValue > 1) trend = 'up';
        else if (trendValue < -1) trend = 'down';
        else trend = 'flat';
      }

      return {
        id: a.id,
        name,
        avatar: initials(name),
        role: roleLabel,
        totalInterviews: a.total,
        avgCandidateScore,
        questionEffectiveness,
        candidateExperience,
        interviewQuality,
        completionRate,
        avgDuration,
        trend,
        trendValue: Math.abs(trendValue),
        radar: [
          { metric: 'Question Clarity', score: questionEffectiveness },
          { metric: 'Technical Accuracy', score: fromCompEffect || avg(a.tech) || avgCandidateScore },
          { metric: 'Candidate Experience', score: candidateExperience },
          { metric: 'Interview Quality', score: interviewQuality },
          { metric: 'Completion Rate', score: completionRate },
          {
            metric: 'Time Management',
            score: a.durations.length
              ? Math.min(100, Math.max(0, 100 - Math.abs(avg(a.durations) - 45)))
              : completionRate,
          },
        ],
      };
    });

    interviewers.sort((a, b) => b.totalInterviews - a.totalInterviews);

    const feedback = feedbackRows.map((fb) => {
      const ratings = (fb.competency_ratings || {}) as CompetencyRatings;
      const star = (keys: string[]) => {
        const vals = keys.map((k) => Number(ratings[k])).filter((n) => n > 0);
        return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
      };
      const candNameVal = candName[fb.candidate_id as string] || 'Candidate';
      const roleVal = ivRole[fb.interview_id as string] || '—';
      const interviewerName = profileMap[fb.recruiter_id as string]?.full_name || 'Recruiter';
      return {
        id: fb.id as string,
        interviewer: interviewerName,
        candidate: candNameVal,
        role: roleVal,
        date: fb.created_at ? String(fb.created_at).slice(0, 10) : '',
        candidateImpression: star(['culture_fit', 'leadership', 'adaptability']),
        questionClarity: star(['problem_solving', 'communication']),
        technicalAccuracy: star(['technical_skills', 'problem_solving']),
        overallExperience: star([
          'technical_skills',
          'communication',
          'problem_solving',
          'culture_fit',
          'leadership',
          'adaptability',
        ]),
        notes: (fb.overall_notes || fb.strengths || '') as string,
        decision: fb.decision as string | null,
        status: 'completed' as const,
      };
    });

    // Monthly quality trend from interview scores
    const monthMap: Record<string, { quality: number[]; experience: number[]; effectiveness: number[]; order: number }> = {};
    for (const iv of interviews) {
      if (!iv.created_at) continue;
      const label = monthLabel(iv.created_at);
      const order = new Date(iv.created_at).getFullYear() * 12 + new Date(iv.created_at).getMonth();
      if (!monthMap[label]) monthMap[label] = { quality: [], experience: [], effectiveness: [], order };
      if (typeof iv.overall_score === 'number' && iv.overall_score > 0) {
        monthMap[label].quality.push(iv.overall_score);
      }
      if (typeof iv.communication_score === 'number' && iv.communication_score > 0) {
        monthMap[label].experience.push(iv.communication_score);
      }
      if (typeof iv.technical_score === 'number' && iv.technical_score > 0) {
        monthMap[label].effectiveness.push(iv.technical_score);
      }
    }
    const qualityTrend = Object.entries(monthMap)
      .sort(([, a], [, b]) => a.order - b.order)
      .map(([month, m]) => ({
        month,
        quality: avg(m.quality) || 0,
        experience: avg(m.experience) || avg(m.quality) || 0,
        effectiveness: avg(m.effectiveness) || avg(m.quality) || 0,
      }));

    const kpis = {
      avgQuality: avg(interviewers.map((i) => i.interviewQuality).filter((n) => n > 0)),
      avgExperience: avg(interviewers.map((i) => i.candidateExperience).filter((n) => n > 0)),
      avgEffectiveness: avg(interviewers.map((i) => i.questionEffectiveness).filter((n) => n > 0)),
      totalInterviews: interviews.length,
      scoreDelta:
        interviewers.length === 1
          ? interviewers[0].trend === 'down'
            ? -interviewers[0].trendValue
            : interviewers[0].trendValue
          : avg(
              interviewers.map((i) =>
                i.trend === 'down' ? -i.trendValue : i.trend === 'up' ? i.trendValue : 0,
              ),
            ),
    };

    return secureJson({
      data: {
        interviewers,
        feedback,
        qualityTrend,
        kpis,
        empty: interviewers.length === 0 && feedback.length === 0,
        rangeDays,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
