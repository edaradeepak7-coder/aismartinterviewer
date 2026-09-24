import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/progress-center
 * Aggregate interviews, assessment_results, and subscription credits for auth user.
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

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, plan_name, status, credits_remaining, credits_total, credits_used')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!candidate) {
      return secureJson({
        mcqHistory: [],
        interviewHistory: [],
        courseProgress: [],
        certificates: [],
        scoreTrend: [],
        subscription: subscription || null,
        credits: {
          remaining: subscription?.credits_remaining ?? 0,
          total: subscription?.credits_total ?? 0,
          used: subscription?.credits_used ?? 0,
        },
      });
    }

    const [interviewsRes, assessmentsRes] = await Promise.all([
      supabase
        .from('interviews')
        .select(
          'id, company, role, interview_type, overall_score, communication_score, technical_score, role_alignment_score, duration_minutes, status, completed_at, created_at, scheduled_at'
        )
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })
        .limit(100),
      supabase
        .from('assessment_results')
        .select(
          'id, assessment_id, score, total_points, time_taken_minutes, mcq_score, status, completed_at, created_at, candidate_email'
        )
        .eq('candidate_id', candidate.id)
        .order('completed_at', { ascending: false })
        .limit(100),
    ]);

    let assessmentRows = assessmentsRes.data || [];
    // Fallback: match by email if candidate_id rows are empty (RLS may still filter)
    if (assessmentRows.length === 0 && (candidate.email || user.email)) {
      const email = candidate.email || user.email;
      const { data: byEmail } = await supabase
        .from('assessment_results')
        .select(
          'id, assessment_id, score, total_points, time_taken_minutes, mcq_score, status, completed_at, created_at, candidate_email'
        )
        .eq('candidate_email', email!)
        .order('completed_at', { ascending: false })
        .limit(100);
      assessmentRows = byEmail || [];
    }

    const assessmentIds = [
      ...new Set(assessmentRows.map((r) => r.assessment_id as string).filter(Boolean)),
    ];
    const titleMap: Record<string, string> = {};
    const tagsMap: Record<string, string[]> = {};
    if (assessmentIds.length) {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, tags')
        .in('id', assessmentIds);
      for (const a of assessments || []) {
        titleMap[a.id] = a.title || 'Assessment';
        tagsMap[a.id] = Array.isArray(a.tags) ? a.tags : [];
      }
    }

    const mcqHistory = assessmentRows.map((r, idx) => {
      const total = r.total_points || 100;
      const score = typeof r.mcq_score === 'number' ? r.mcq_score : r.score;
      const percentage = total > 0 ? Math.round((score / total) * 100) : score;
      const dateIso = r.completed_at || r.created_at;
      const tags = tagsMap[r.assessment_id] || [];
      return {
        id: r.id || String(idx + 1),
        assessment: titleMap[r.assessment_id] || 'Assessment',
        subject: tags[0] || 'General',
        date: dateIso ? new Date(dateIso).toISOString().slice(0, 10) : '',
        score: percentage,
        percentage,
        attempts: 1,
        timeTaken: r.time_taken_minutes != null ? `${r.time_taken_minutes} min` : '—',
        passed: r.status === 'passed' || percentage >= 60,
      };
    });

    const interviewHistory = (interviewsRes.data || []).map((iv) => {
      const dateIso = iv.completed_at || iv.scheduled_at || iv.created_at;
      const score = Number(iv.overall_score) || 0;
      return {
        id: iv.id,
        company: (iv.company || '').trim() || iv.role || 'Practice',
        subject: iv.interview_type || iv.role || 'Interview',
        date: dateIso ? new Date(dateIso).toISOString().slice(0, 10) : '',
        score,
        communication: Number(iv.communication_score) || 0,
        technical: Number(iv.technical_score) || 0,
        confidence: Number(iv.role_alignment_score) || Number(iv.communication_score) || 0,
        duration: iv.duration_minutes != null ? `${iv.duration_minutes} min` : '—',
        status: iv.status === 'completed' || iv.status === 'reviewed' ? 'Completed' : (iv.status || 'Pending'),
      };
    });

    // Score trend by month from MCQ + interviews
    const monthBuckets: Record<string, { mcq: number[]; interview: number[]; label: string }> = {};
    const pushMonth = (iso: string, kind: 'mcq' | 'interview', value: number) => {
      if (!iso || !value) return;
      const key = iso.slice(0, 7);
      const label = new Date(iso).toLocaleDateString('en-US', { month: 'short' });
      if (!monthBuckets[key]) monthBuckets[key] = { mcq: [], interview: [], label };
      monthBuckets[key][kind].push(value);
    };
    for (const m of mcqHistory) pushMonth(m.date, 'mcq', m.score);
    for (const i of interviewHistory) pushMonth(i.date, 'interview', i.score);

    const scoreTrend = Object.keys(monthBuckets)
      .sort()
      .slice(-6)
      .map((k) => {
        const b = monthBuckets[k];
        const avg = (arr: number[]) =>
          arr.length ? Math.round(arr.reduce((a, c) => a + c, 0) / arr.length) : 0;
        return { month: b.label, mcq: avg(b.mcq), interview: avg(b.interview) };
      });

    // Courses / certificates not backed by candidate tables yet — honest empty
    return secureJson({
      mcqHistory,
      interviewHistory,
      courseProgress: [],
      certificates: [],
      scoreTrend,
      subscription: subscription || null,
      credits: {
        remaining: subscription?.credits_remaining ?? 0,
        total: subscription?.credits_total ?? 0,
        used: subscription?.credits_used ?? 0,
      },
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
