import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/resume-roadmap
 * Progress aggregates from interviews + assessment_results for roadmap gating.
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, email')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!candidate) {
      return secureJson({
        fundamentalsScore: 0,
        subjectPracticeScore: 0,
        mockInterviewsAttempted: 0,
        assessmentCount: 0,
        interviewCount: 0,
      });
    }

    const [interviewsRes, assessmentsRes] = await Promise.all([
      supabase
        .from('interviews')
        .select('id, overall_score, status, completed_at')
        .eq('candidate_id', candidate.id)
        .limit(200),
      supabase
        .from('assessment_results')
        .select('id, score, total_points, mcq_score, status, completed_at')
        .eq('candidate_id', candidate.id)
        .limit(200),
    ]);

    let assessments = assessmentsRes.data || [];
    if (assessments.length === 0 && (candidate.email || user.email)) {
      const { data: byEmail } = await supabase
        .from('assessment_results')
        .select('id, score, total_points, mcq_score, status, completed_at')
        .eq('candidate_email', candidate.email || user.email!)
        .limit(200);
      assessments = byEmail || [];
    }

    const interviews = interviewsRes.data || [];
    const completedInterviews = interviews.filter(
      (i) =>
        i.status === 'completed' ||
        i.status === 'reviewed' ||
        i.completed_at != null ||
        i.overall_score != null
    );

    const pctScores = assessments.map((a) => {
      const total = a.total_points || 100;
      const raw = typeof a.mcq_score === 'number' ? a.mcq_score : a.score;
      return total > 0 && raw <= total ? Math.round((raw / total) * 100) : Number(raw) || 0;
    });

    // Fundamentals ≈ average of early/all assessment scores; practice ≈ best recent half
    const fundamentalsScore =
      pctScores.length > 0
        ? Math.round(pctScores.reduce((s, v) => s + v, 0) / pctScores.length)
        : 0;

    const sortedAsc = [...pctScores].sort((a, b) => a - b);
    const topHalf = sortedAsc.slice(Math.floor(sortedAsc.length / 2));
    const subjectPracticeScore =
      topHalf.length > 0
        ? Math.round(topHalf.reduce((s, v) => s + v, 0) / topHalf.length)
        : fundamentalsScore;

    // If no assessments but interviews have scores, derive practice from interview avg
    const interviewScores = completedInterviews
      .map((i) => Number(i.overall_score) || 0)
      .filter((s) => s > 0);
    const interviewAvg =
      interviewScores.length > 0
        ? Math.round(interviewScores.reduce((s, v) => s + v, 0) / interviewScores.length)
        : 0;

    return secureJson({
      fundamentalsScore: fundamentalsScore || (interviewAvg ? Math.min(interviewAvg, 100) : 0),
      subjectPracticeScore:
        subjectPracticeScore || (interviewAvg ? Math.min(interviewAvg, 100) : 0),
      mockInterviewsAttempted: completedInterviews.length,
      assessmentCount: assessments.length,
      interviewCount: interviews.length,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
