import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidEmail, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

const STAFF = new Set([
  'recruiter',
  'org_admin',
  'admin',
  'super_admin',
  'evaluator',
  'faculty',
  'institution_admin',
]);

const RESULT_STATUSES = new Set(['passed', 'failed', 'pending']);

/**
 * GET /api/assessment-results?assessment_id=&status=
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

    const assessmentId = request.nextUrl.searchParams.get('assessment_id');
    const status = request.nextUrl.searchParams.get('status');
    if (assessmentId && !isValidUUID(assessmentId)) {
      return badRequestResponse('Invalid assessment_id');
    }
    if (status && !RESULT_STATUSES.has(status)) {
      return badRequestResponse('Invalid status');
    }

    const isAdmin = ['admin', 'super_admin', 'org_admin'].includes(profile.role);

    let query = supabase
      .from('assessment_results')
      .select(
        'id, assessment_id, candidate_id, candidate_name, candidate_email, score, total_points, time_taken_minutes, mcq_score, coding_score, subjective_score, status, completed_at, created_at',
      )
      .order('score', { ascending: false })
      .limit(500);

    if (assessmentId) query = query.eq('assessment_id', assessmentId);
    if (status) query = query.eq('status', status);
    if (!isAdmin) query = query.eq('recruiter_id', user.id);

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    const assessmentIds = [
      ...new Set((data || []).map((r) => r.assessment_id as string).filter(Boolean)),
    ];
    const titleMap: Record<string, string> = {};
    if (assessmentIds.length) {
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title')
        .in('id', assessmentIds);
      for (const a of assessments || []) titleMap[a.id] = a.title || 'Assessment';
    }

    const rows = (data || []).map((r) => {
      return {
        id: r.id,
        assessmentId: r.assessment_id,
        assessmentTitle: titleMap[r.assessment_id as string] || 'Assessment',
        name: r.candidate_name || 'Candidate',
        email: r.candidate_email || '',
        score: r.score ?? 0,
        totalPoints: r.total_points ?? 100,
        timeTaken: r.time_taken_minutes ?? 0,
        mcqScore: r.mcq_score ?? 0,
        codingScore: r.coding_score ?? 0,
        subjectiveScore: r.subjective_score ?? 0,
        status: r.status as 'passed' | 'failed' | 'pending',
        completedAt: r.completed_at
          ? String(r.completed_at).replace('T', ' ').slice(0, 16)
          : '—',
        rank: 0,
      };
    });

    // Re-rank only among completed
    let rank = 0;
    const ranked = rows
      .slice()
      .sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return 1;
        if (b.status === 'pending' && a.status !== 'pending') return -1;
        return b.score - a.score;
      })
      .map((r) => {
        if (r.status === 'pending') return { ...r, rank: 0 };
        rank += 1;
        return { ...r, rank };
      });

    return secureJson({ data: ranked });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}

/**
 * POST /api/assessment-results
 * Body: assessment_id, score, total_points, time_taken_minutes, mcq/coding/subjective scores,
 *       status, candidate_name?, candidate_email?, candidate_id?, answers?
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name, email')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !STAFF.has(profile.role)) return forbiddenResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const assessmentId = sanitizeString(String(body.assessment_id ?? ''));
    if (!isValidUUID(assessmentId)) return badRequestResponse('assessment_id is required');

    const { data: assessment } = await supabase
      .from('assessments')
      .select('id, total_points, title')
      .eq('id', assessmentId)
      .maybeSingle();
    if (!assessment) return badRequestResponse('Assessment not found');

    const score = typeof body.score === 'number' ? Math.max(0, body.score) : 0;
    const totalPoints =
      typeof body.total_points === 'number'
        ? Math.max(1, body.total_points)
        : assessment.total_points || 100;
    const timeTaken =
      typeof body.time_taken_minutes === 'number'
        ? Math.max(0, Math.min(480, body.time_taken_minutes))
        : 0;
    const mcq = typeof body.mcq_score === 'number' ? Math.max(0, body.mcq_score) : 0;
    const coding = typeof body.coding_score === 'number' ? Math.max(0, body.coding_score) : 0;
    const subjective =
      typeof body.subjective_score === 'number' ? Math.max(0, body.subjective_score) : 0;

    let status = sanitizeString(String(body.status ?? ''));
    if (!RESULT_STATUSES.has(status)) {
      const pct = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
      status = pct >= 60 ? 'passed' : 'failed';
    }

    const name =
      sanitizeString(String(body.candidate_name ?? '')).slice(0, 120) ||
      profile.full_name ||
      'Candidate';
    const emailRaw = sanitizeString(String(body.candidate_email ?? profile.email ?? '')).toLowerCase();
    const email = isValidEmail(emailRaw) ? emailRaw : '';
    const candidateId = body.candidate_id ? sanitizeString(String(body.candidate_id)) : null;
    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');

    const { data, error } = await supabase
      .from('assessment_results')
      .insert({
        assessment_id: assessmentId,
        candidate_id: candidateId,
        recruiter_id: user.id,
        candidate_name: name,
        candidate_email: email,
        score,
        total_points: totalPoints,
        time_taken_minutes: timeTaken,
        mcq_score: mcq,
        coding_score: coding,
        subjective_score: subjective,
        status,
        answers: body.answers && typeof body.answers === 'object' ? body.answers : {},
        completed_at: status === 'pending' ? null : new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
