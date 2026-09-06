import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

const ALLOWED_STATUSES = ['draft', 'published', 'closed'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const candidateId = searchParams.get('candidate_id');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const offset = (page - 1) * limit;

    if (status && !ALLOWED_STATUSES.includes(status as any)) return badRequestResponse('Invalid status');
    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');

    let query = supabase
      .from('assessments')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) query = query.eq('status', status);
    if (candidateId) query = query.eq('candidate_id', candidateId);

    const { data, error, count } = await query;
    if (error) return secureJson({ error: 'Failed to fetch assessments' }, 500);

    return secureJson({ data: data || [], total: count || 0, page, limit });
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

    if (error) return secureJson({ error: 'Failed to create assessment' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
