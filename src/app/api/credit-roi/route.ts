import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

interface SessionROI {
  session_id: string;
  date: string;
  topic: string;
  credits_spent: number;
  score: number;
  cost_per_point: number;
  roi_score: number;
}

/**
 * GET /api/credit-roi
 * Compute ROI from credit_usage + interviews for the auth user.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    const [usageRes, interviewsRes, subRes] = await Promise.all([
      supabase
        .from('credit_usage')
        .select('id, feature, action_type, credits_used, credits_consumed, reference_id, reference_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(200),
      candidate
        ? supabase
            .from('interviews')
            .select('id, created_at, completed_at, role, interview_type, overall_score, company, status')
            .eq('candidate_id', candidate.id)
            .order('created_at', { ascending: true })
            .limit(100)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      supabase
        .from('subscriptions')
        .select('id, plan_name, credits_remaining, credits_total, credits_used, status')
        .eq('user_id', user.id)
        .in('status', ['active', 'paused', 'trialing'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const usage = usageRes.data || [];
    const interviews = (interviewsRes.data || []) as {
      id: string;
      created_at: string;
      completed_at: string | null;
      role: string | null;
      interview_type: string | null;
      overall_score: number | null;
      company: string | null;
      status: string | null;
    }[];

    const usageByRef = new Map<string, number>();
    for (const u of usage) {
      const credits = Number(u.credits_used ?? u.credits_consumed ?? 0) || 0;
      if (u.reference_id) {
        usageByRef.set(u.reference_id, (usageByRef.get(u.reference_id) || 0) + credits);
      }
    }

    // Prefer interviews with scores; fall back to credit_usage rows as sessions
    let sessions: SessionROI[] = [];

    if (interviews.length > 0) {
      const interviewIds = new Set(interviews.map((i) => i.id));
      const scored = interviews.filter(
        (iv) => iv.overall_score != null || ['completed', 'reviewed', 'scored'].includes(iv.status || '')
      );
      const source = scored.length > 0 ? scored : interviews;

      sessions = source.map((iv) => {
        const credits =
          usageByRef.get(iv.id) ||
          (usage.find((u) => u.feature?.toLowerCase().includes('interview'))
            ? Number(
                usage.find((u) => u.reference_id === iv.id)?.credits_used ??
                  usage.find((u) => u.reference_id === iv.id)?.credits_consumed ??
                  10
              )
            : 10);
        const score = Number(iv.overall_score) || 0;
        const cost_per_point = score > 0 ? parseFloat((credits / score).toFixed(2)) : 0;
        const roi_score = credits > 0 && score > 0 ? Math.round((score / credits) * 10) : 0;
        return {
          session_id: iv.id,
          date: iv.completed_at || iv.created_at,
          topic: iv.interview_type || iv.role || 'Interview',
          credits_spent: credits,
          score,
          cost_per_point,
          roi_score,
        };
      });

      // Include credit usage not tied to an interview as extra sessions
      for (const u of usage) {
        if (u.reference_id && interviewIds.has(u.reference_id)) continue;
        const credits = Number(u.credits_used ?? u.credits_consumed ?? 0) || 0;
        if (credits <= 0) continue;
        if (!String(u.feature || '').toLowerCase().includes('interview') &&
            !String(u.action_type || '').toLowerCase().includes('interview')) {
          continue;
        }
        sessions.push({
          session_id: u.id,
          date: u.created_at,
          topic: u.feature || 'AI Interview',
          credits_spent: credits,
          score: 0,
          cost_per_point: 0,
          roi_score: 0,
        });
      }
      sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    } else if (usage.length > 0) {
      sessions = usage.map((u) => {
        const credits = Number(u.credits_used ?? u.credits_consumed ?? 0) || 0;
        return {
          session_id: u.id,
          date: u.created_at,
          topic: u.feature || u.action_type || 'Usage',
          credits_spent: credits,
          score: 0,
          cost_per_point: 0,
          roi_score: 0,
        };
      });
    }

    const totalCreditsSpent = sessions.reduce((s, m) => s + m.credits_spent, 0);
    const scoredSessions = sessions.filter((s) => s.score > 0);
    const avgScore =
      scoredSessions.length > 0
        ? scoredSessions.reduce((s, m) => s + m.score, 0) / scoredSessions.length
        : 0;
    const avgROI =
      sessions.length > 0
        ? sessions.reduce((s, m) => s + m.roi_score, 0) / sessions.length
        : 0;
    const recent = scoredSessions.slice(-3);
    const older = scoredSessions.slice(-6, -3);
    const recentAvg = recent.reduce((s, m) => s + m.score, 0) / (recent.length || 1);
    const olderAvg = older.length
      ? older.reduce((s, m) => s + m.score, 0) / older.length
      : recentAvg;
    const trendPct =
      older.length && olderAvg > 0
        ? parseFloat((((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1))
        : 0;

    const summary = {
      totalCreditsSpent,
      totalSessions: sessions.length,
      avgScore: parseFloat(avgScore.toFixed(1)),
      avgROIScore: parseFloat(avgROI.toFixed(1)),
      costPerSession:
        sessions.length > 0 ? parseFloat((totalCreditsSpent / sessions.length).toFixed(1)) : 0,
      costPerPoint:
        avgScore > 0 && sessions.length > 0
          ? parseFloat((totalCreditsSpent / (avgScore * scoredSessions.length || 1)).toFixed(2))
          : 0,
      trend: (trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
      trendPct: Math.abs(trendPct),
    };

    const trendChartData = sessions.map((s) => ({
      date: new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      score: s.score,
      credits: s.credits_spent,
      roi: s.roi_score,
    }));

    const topicMap: Record<string, { total_credits: number; total_score: number; count: number }> = {};
    sessions.forEach((s) => {
      if (!topicMap[s.topic]) topicMap[s.topic] = { total_credits: 0, total_score: 0, count: 0 };
      topicMap[s.topic].total_credits += s.credits_spent;
      topicMap[s.topic].total_score += s.score;
      topicMap[s.topic].count += 1;
    });
    const topicData = Object.entries(topicMap).map(([topic, d]) => ({
      topic,
      avg_score: d.count ? Math.round(d.total_score / d.count) : 0,
      total_credits: d.total_credits,
      roi:
        d.count && d.total_credits
          ? Math.round((d.total_score / d.count) / (d.total_credits / d.count) * 10)
          : 0,
    }));

    return secureJson({
      sessions,
      summary,
      trendChartData,
      topicData,
      subscription: subRes.data || null,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
