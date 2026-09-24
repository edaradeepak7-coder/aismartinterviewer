import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/lsrw — exercises + user attempts summary
 * POST /api/lsrw — { exerciseId, score? } record attempt
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const [exRes, attRes] = await Promise.all([
      supabase
        .from('lsrw_exercises')
        .select('id, skill, title, content, credit_cost')
        .order('skill', { ascending: true }),
      supabase
        .from('lsrw_attempts')
        .select('id, exercise_id, score, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
    ]);

    if (exRes.error) return secureJson({ error: exRes.error.message }, 500);

    const attempts = attRes.data || [];
    const bestByExercise: Record<string, number> = {};
    for (const a of attempts) {
      const prev = bestByExercise[a.exercise_id];
      if (prev == null || a.score > prev) bestByExercise[a.exercise_id] = a.score;
    }

    const exercises = (exRes.data || []).map((e) => ({
      id: e.id,
      skill: e.skill,
      title: e.title,
      content: e.content || {},
      creditCost: e.credit_cost,
      bestScore: bestByExercise[e.id] ?? null,
      attempted: e.id in bestByExercise,
    }));

    const skillProgress: Record<string, { attempts: number; avgScore: number }> = {};
    for (const skill of ['listening', 'speaking', 'reading', 'writing']) {
      const skillExIds = new Set(exercises.filter((e) => e.skill === skill).map((e) => e.id));
      const skillAttempts = attempts.filter((a) => skillExIds.has(a.exercise_id));
      const avg =
        skillAttempts.length > 0
          ? Math.round(
              skillAttempts.reduce((s, a) => s + a.score, 0) / skillAttempts.length
            )
          : 0;
      skillProgress[skill] = { attempts: skillAttempts.length, avgScore: avg };
    }

    return secureJson({ exercises, attempts: attempts.slice(0, 50), skillProgress });
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
    const exerciseId = body.exerciseId || body.exercise_id;
    if (!exerciseId || typeof exerciseId !== 'string') {
      return badRequestResponse('exerciseId is required');
    }

    const { data: exercise } = await supabase
      .from('lsrw_exercises')
      .select('id, credit_cost')
      .eq('id', exerciseId)
      .maybeSingle();

    if (!exercise) return secureJson({ error: 'Exercise not found' }, 404);

    const cost = Number(exercise.credit_cost) || 0;
    if (cost > 0) {
      const { data: creditResult, error: creditError } = await supabase.rpc('consume_credits', {
        p_user_id: user.id,
        p_action_type: 'attempt',
        p_feature: 'lsrw',
        p_credits: cost,
        p_reference_id: exerciseId,
        p_reference_type: 'lsrw_exercise',
      });
      if (creditError) {
        return secureJson({ error: creditError.message || 'Credit deduction failed' }, 500);
      }
      const result = creditResult as { success?: boolean; error?: string } | null;
      if (result && result.success === false) {
        return secureJson({ error: result.error || 'Insufficient credits' }, 402);
      }
    }

    let score = typeof body.score === 'number' ? Math.round(body.score) : 0;
    score = Math.max(0, Math.min(100, score));

    const { data: attempt, error } = await supabase
      .from('lsrw_attempts')
      .insert({
        user_id: user.id,
        exercise_id: exerciseId,
        score,
      })
      .select('id, exercise_id, score, created_at')
      .single();

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({ success: true, attempt });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
