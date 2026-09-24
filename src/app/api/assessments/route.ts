import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

const ALLOWED_STATUSES = ['draft', 'published', 'closed'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    if (status && !ALLOWED_STATUSES.includes(status as any)) return badRequestResponse('Invalid status');

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let query = supabase
      .from('assessments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    const isAdmin = profile && ['admin', 'super_admin', 'org_admin'].includes(profile.role);
    if (!isAdmin) query = query.eq('created_by', user.id);

    const { data, error, count } = await query;
    if (error) return secureJson({ error: error.message || 'Failed to fetch assessments' }, 500);

    const ids = (data || []).map((a) => a.id as string);
    const statsMap: Record<string, { assigned: number; completions: number; scores: number[] }> = {};
    if (ids.length) {
      const { data: results } = await supabase
        .from('assessment_results')
        .select('assessment_id, status, score, total_points')
        .in('assessment_id', ids);
      for (const r of results || []) {
        const aid = r.assessment_id as string;
        if (!statsMap[aid]) statsMap[aid] = { assigned: 0, completions: 0, scores: [] };
        statsMap[aid].assigned += 1;
        if (r.status !== 'pending') {
          statsMap[aid].completions += 1;
          const tp = r.total_points || 100;
          if (typeof r.score === 'number' && tp > 0) {
            statsMap[aid].scores.push(Math.round((r.score / tp) * 100));
          }
        }
      }
    }

    const enriched = (data || []).map((a) => {
      const s = statsMap[a.id as string];
      const avgScore =
        s?.scores.length
          ? Math.round(s.scores.reduce((x, y) => x + y, 0) / s.scores.length)
          : 0;
      return {
        ...a,
        assigned_to: s?.assigned || 0,
        completions: s?.completions || 0,
        avg_score: avgScore,
      };
    });

    return secureJson({ data: enriched, total: count || 0, page, limit });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const CREATOR_ROLES = ['super_admin', 'institution_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty'];
    if (!profile || !CREATOR_ROLES.includes(profile.role)) return forbiddenResponse();

    let body: any;
    try { body = await request.json(); } catch { return badRequestResponse('Invalid JSON'); }

    const title = sanitizeString(body.title || '').slice(0, 200);
    if (!title) return badRequestResponse('title is required');

    const status = ALLOWED_STATUSES.includes(body.status) ? body.status : 'draft';

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        title,
        description: body.description ? sanitizeString(body.description).slice(0, 2000) : null,
        duration: typeof body.duration === 'number' ? Math.min(body.duration, 480) : 60,
        total_points: typeof body.total_points === 'number' ? body.total_points : 100,
        status,
        questions: Array.isArray(body.questions) ? body.questions : [],
        tags: Array.isArray(body.tags) ? body.tags.slice(0, 20) : [],
        created_by: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return secureJson({ error: error.message || 'Failed to create assessment' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
