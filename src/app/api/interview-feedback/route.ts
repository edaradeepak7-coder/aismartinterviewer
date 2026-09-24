import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

function asStringArray(val: unknown): string[] {
  if (!Array.isArray(val)) return [];
  return val.filter((v): v is string => typeof v === 'string').slice(0, 20);
}

function monthLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short' });
}

/**
 * GET /api/interview-feedback?interview_id=
 * Candidate-safe feedback from interview_results for the auth user.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const interviewId = request.nextUrl.searchParams.get('interview_id');
    if (interviewId && !isValidUUID(interviewId)) {
      return badRequestResponse('Invalid interview_id');
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!candidate) {
      return secureJson({
        feedbacks: [],
        answerFeedbacks: [],
        improvementTips: [],
        trendData: [],
        radarData: [],
        selected: null,
      });
    }

    const { data: interviews, error: ivErr } = await supabase
      .from('interviews')
      .select(
        'id, role, company, scheduled_at, completed_at, created_at, overall_score, technical_score, communication_score, role_alignment_score, recommendation, status, interviewer_id'
      )
      .eq('candidate_id', candidate.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (ivErr) return secureJson({ error: 'Failed to fetch interviews' }, 500);

    const interviewList = interviews || [];
    const ids = interviewList.map((i) => i.id);
    if (ids.length === 0) {
      return secureJson({
        feedbacks: [],
        answerFeedbacks: [],
        improvementTips: [],
        trendData: [],
        radarData: [],
        selected: null,
      });
    }

    const [{ data: results }, { data: ratings }] = await Promise.all([
      supabase.from('interview_results').select('*').in('interview_id', ids),
      supabase
        .from('interview_ratings')
        .select('interview_id, rating')
        .eq('user_id', user.id)
        .in('interview_id', ids),
    ]);

    const resultByInterview = new Map(
      (results || []).map((r: { interview_id: string }) => [r.interview_id, r])
    );
    const ratingByInterview = new Map(
      (ratings || []).map((r: { interview_id: string; rating: number }) => [r.interview_id, r.rating])
    );

    const feedbacks = interviewList.map((iv) => {
      const result = resultByInterview.get(iv.id) as Record<string, unknown> | undefined;
      const savedRating = ratingByInterview.get(iv.id);
      const userRating =
        typeof savedRating === 'number' && savedRating >= 1 && savedRating <= 5
          ? savedRating
          : null;
      const finalScore =
        (typeof result?.final_score === 'number' ? result.final_score : null) ??
        (typeof iv.overall_score === 'number' ? iv.overall_score : 0);
      const tech =
        (typeof result?.technical_depth_score === 'number' ? result.technical_depth_score : null) ??
        (typeof iv.technical_score === 'number' ? iv.technical_score : 0);
      const comm =
        (typeof result?.communication_score === 'number' ? result.communication_score : null) ??
        (typeof iv.communication_score === 'number' ? iv.communication_score : 0);
      const problemSolving =
        typeof iv.role_alignment_score === 'number' ? iv.role_alignment_score : Math.round((tech + comm) / 2);
      const dateIso = iv.completed_at || iv.scheduled_at || iv.created_at;

      return {
        id: iv.id,
        company: (iv.company || '').trim() || 'Practice',
        role: iv.role || 'Interview',
        date: dateIso ? new Date(dateIso).toISOString().slice(0, 10) : '',
        interviewer: 'AI Interviewer',
        overallScore: Number(finalScore) || 0,
        userRating,
        status: (userRating != null ? 'rated' : 'pending_rating') as 'rated' | 'pending_rating',
        aiSummary:
          (typeof result?.ai_summary === 'string' && result.ai_summary) ||
          'No AI summary available yet for this interview.',
        interviewer_comments: '',
        strengths: asStringArray(result?.strengths),
        improvements: asStringArray(result?.improvements),
        technicalScore: Number(tech) || 0,
        communicationScore: Number(comm) || 0,
        problemSolvingScore: Number(problemSolving) || 0,
        behavioralScore: Number(comm) || 0,
      };
    });

    const selectedId =
      interviewId && ids.includes(interviewId)
        ? interviewId
        : interviewList[0]?.id ?? null;
    const selectedInterview = interviewList.find((i) => i.id === selectedId) || null;
    const selectedResult = selectedId
      ? (resultByInterview.get(selectedId) as Record<string, unknown> | undefined)
      : undefined;

    const rawAnswers = Array.isArray(selectedResult?.answer_feedbacks)
      ? (selectedResult!.answer_feedbacks as Record<string, unknown>[])
      : [];

    const answerFeedbacks = rawAnswers.map((af, idx) => {
      const communication =
        typeof af.communicationScore === 'number'
          ? af.communicationScore
          : typeof af.communication === 'number'
            ? af.communication
            : 0;
      const domain =
        typeof af.technicalScore === 'number'
          ? af.technicalScore
          : typeof af.domainCompetency === 'number'
            ? af.domainCompetency
            : 0;
      const clarity =
        typeof af.clarity === 'number'
          ? af.clarity
          : Math.round((communication + domain) / 2);
      const overall =
        typeof af.score === 'number'
          ? af.score
          : typeof af.overallScore === 'number'
            ? af.overallScore
            : Math.round((communication + clarity + domain) / 3);
      const tips = (af.aiTips as Record<string, string> | undefined) || {};
      const improvements = asStringArray(af.improvements);
      const tipFallback = improvements[0] || 'Review this answer and add more specific examples.';

      return {
        questionId: typeof af.questionNumber === 'number' ? af.questionNumber : idx + 1,
        question: typeof af.question === 'string' ? af.question : `Question ${idx + 1}`,
        candidateAnswer:
          (typeof af.answerSummary === 'string' && af.answerSummary) ||
          (typeof af.candidateAnswer === 'string' && af.candidateAnswer) ||
          (typeof af.answer === 'string' && af.answer) ||
          '',
        communication,
        clarity,
        domainCompetency: domain,
        overallScore: overall,
        aiTips: {
          communication: tips.communication || tipFallback,
          clarity: tips.clarity || tipFallback,
          domainCompetency: tips.domainCompetency || tipFallback,
        },
        strengths: asStringArray(af.strengths),
        improvements,
        isPremium: false,
      };
    });

    const improvementTips = Array.isArray(selectedResult?.improvement_tips)
      ? selectedResult!.improvement_tips
      : [];

    // Trend: group by month (oldest → newest), last 6 months with data
    const byMonth: Record<string, { overall: number[]; technical: number[]; communication: number[]; problemSolving: number[]; key: string }> = {};
    for (const f of [...feedbacks].reverse()) {
      if (!f.date) continue;
      const key = f.date.slice(0, 7);
      const label = monthLabel(f.date);
      if (!byMonth[key]) {
        byMonth[key] = { overall: [], technical: [], communication: [], problemSolving: [], key: label };
      }
      byMonth[key].overall.push(f.overallScore);
      byMonth[key].technical.push(f.technicalScore);
      byMonth[key].communication.push(f.communicationScore);
      byMonth[key].problemSolving.push(f.problemSolvingScore);
    }
    const trendData = Object.keys(byMonth)
      .sort()
      .slice(-6)
      .map((k) => {
        const m = byMonth[k];
        const avg = (arr: number[]) =>
          arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
        return {
          month: m.key,
          overall: avg(m.overall),
          technical: avg(m.technical),
          communication: avg(m.communication),
          problemSolving: avg(m.problemSolving),
        };
      });

    const latest = feedbacks[0];
    const previous = feedbacks[1];
    const radarData = latest
      ? [
          { subject: 'Technical', current: latest.technicalScore, previous: previous?.technicalScore ?? 0 },
          { subject: 'Communication', current: latest.communicationScore, previous: previous?.communicationScore ?? 0 },
          { subject: 'Problem Solving', current: latest.problemSolvingScore, previous: previous?.problemSolvingScore ?? 0 },
          { subject: 'Behavioral', current: latest.behavioralScore, previous: previous?.behavioralScore ?? 0 },
          {
            subject: 'System Design',
            current: Math.round((latest.technicalScore + latest.problemSolvingScore) / 2),
            previous: previous
              ? Math.round((previous.technicalScore + previous.problemSolvingScore) / 2)
              : 0,
          },
        ]
      : [];

    return secureJson({
      feedbacks,
      answerFeedbacks,
      improvementTips,
      trendData,
      radarData,
      selected: selectedInterview
        ? {
            id: selectedInterview.id,
            company: (selectedInterview.company || '').trim() || 'Practice',
            role: selectedInterview.role || 'Interview',
            date: selectedInterview.completed_at || selectedInterview.scheduled_at || selectedInterview.created_at,
            communicationScore: latest?.communicationScore ?? 0,
            clarityScore: Math.round(
              ((latest?.communicationScore ?? 0) + (latest?.technicalScore ?? 0)) / 2
            ),
            domainScore: latest?.technicalScore ?? 0,
            overallScore: latest?.overallScore ?? 0,
          }
        : null,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/interview-feedback
 * Body: { interviewId, rating: 1-5 }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const interviewId = String(body.interviewId || body.interview_id || '');
    if (!interviewId || !isValidUUID(interviewId)) {
      return badRequestResponse('Valid interviewId is required');
    }

    const rawRating = Number(body.rating);
    if (!Number.isInteger(rawRating) || rawRating < 1 || rawRating > 5) {
      return badRequestResponse('rating must be an integer from 1 to 5');
    }
    const rating = rawRating;

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!candidate) {
      return badRequestResponse('Candidate profile not found');
    }

    const { data: interview } = await supabase
      .from('interviews')
      .select('id')
      .eq('id', interviewId)
      .eq('candidate_id', candidate.id)
      .maybeSingle();

    if (!interview) {
      return badRequestResponse('Interview not found');
    }

    const { data: row, error } = await supabase
      .from('interview_ratings')
      .upsert(
        {
          interview_id: interviewId,
          user_id: user.id,
          rating,
        },
        { onConflict: 'interview_id,user_id' }
      )
      .select('id, interview_id, rating, created_at')
      .single();

    if (error) return secureJson({ error: 'Failed to save rating' }, 500);

    return secureJson({
      success: true,
      rating: row.rating,
      interviewId: row.interview_id,
      status: 'rated',
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
