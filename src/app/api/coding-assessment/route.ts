import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/coding-assessment — problems + user submissions summary
 * POST /api/coding-assessment — { problemId, code } store submission (stub judge)
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const [probRes, subRes] = await Promise.all([
      supabase
        .from('coding_problems')
        .select('id, title, difficulty, prompt, starter_code, tests')
        .order('difficulty', { ascending: true }),
      supabase
        .from('coding_submissions')
        .select('id, problem_id, status, score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (probRes.error) return secureJson({ error: probRes.error.message }, 500);

    const submissions = subRes.data || [];
    const solvedIds = [
      ...new Set(
        submissions.filter((s) => s.status === 'accepted').map((s) => s.problem_id)
      ),
    ];
    const latestByProblem: Record<string, { status: string; score: number }> = {};
    for (const s of submissions) {
      if (!latestByProblem[s.problem_id]) {
        latestByProblem[s.problem_id] = { status: s.status, score: s.score };
      }
    }

    const problems = (probRes.data || []).map((p) => ({
      id: p.id,
      title: p.title,
      difficulty: p.difficulty,
      prompt: p.prompt || '',
      starterCode: p.starter_code || '',
      // Do not leak full test expected values to client — count only
      testCount: Array.isArray(p.tests) ? p.tests.length : 0,
      latestStatus: latestByProblem[p.id]?.status ?? null,
      latestScore: latestByProblem[p.id]?.score ?? null,
      solved: solvedIds.includes(p.id),
    }));

    return secureJson({
      problems,
      solvedIds,
      submissions: submissions.slice(0, 30),
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json().catch(() => ({}));
    const problemId = body.problemId || body.problem_id;
    const code = typeof body.code === 'string' ? body.code : '';

    if (!problemId || typeof problemId !== 'string') {
      return badRequestResponse('problemId is required');
    }

    const { data: problem } = await supabase
      .from('coding_problems')
      .select('id')
      .eq('id', problemId)
      .maybeSingle();

    if (!problem) return secureJson({ error: 'Problem not found' }, 404);

    // Stub judge: store submission as pending with score 0
    const { data: submission, error } = await supabase
      .from('coding_submissions')
      .insert({
        user_id: user.id,
        problem_id: problemId,
        code,
        status: 'pending',
        score: 0,
      })
      .select('id, problem_id, status, score, created_at')
      .single();

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({
      success: true,
      submission,
      message:
        'Submission stored. Automated judging is not available yet — status is pending with score 0.',
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
