import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, parseIntSafe, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate_id');
    const recruiterId = searchParams.get('recruiter_id');
    const status = searchParams.get('status');
    const limit = parseIntSafe(searchParams.get('limit'), 50, 1, 100);
    const offset = parseIntSafe(searchParams.get('offset'), 0, 0, 100_000);

    // Validate UUIDs if provided
    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');
    if (recruiterId && !isValidUUID(recruiterId)) return badRequestResponse('Invalid recruiter_id');

    const ALLOWED_STATUSES = ['scheduled', 'in_progress', 'completed', 'evaluated', 'cancelled'] as const;
    if (status && !ALLOWED_STATUSES.includes(status as any)) return badRequestResponse('Invalid status value');

    let query = supabase
      .from('interviews')
      .select('*, candidates(id, name, email, avatar_initials, role)', { count: 'exact' })
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (candidateId) query = query.eq('candidate_id', candidateId);
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) return secureJson({ error: 'Failed to fetch interviews' }, 500);

    const role =
      (user.user_metadata?.role as string | undefined) ||
      (user.app_metadata?.role as string | undefined) ||
      '';
    const canSeeNotes = ['recruiter', 'admin', 'super_admin', 'institution_admin', 'org_admin'].includes(role);

    const rows = (data || []).map((row: Record<string, unknown>) => {
      if (canSeeNotes && (!row.recruiter_id || row.recruiter_id === user.id || recruiterId === user.id)) {
        return row;
      }
      const { recruiter_notes: _omit, ...rest } = row;
      return rest;
    });

    return secureJson({ data: rows, count, limit, offset });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const candidate_id = sanitizeString(body.candidate_id);
    const role = sanitizeString(body.role);
    const company = sanitizeString(body.company);
    const department = sanitizeString(body.department);
    const interview_type = sanitizeString(body.interview_type);
    const scheduled_at = sanitizeString(body.scheduled_at);
    const recruiter_id = body.recruiter_id ? sanitizeString(body.recruiter_id) : null;
    const question_count = parseIntSafe(body.question_count, 0, 0, 200);

    if (!candidate_id || !role) {
      return badRequestResponse('candidate_id and role are required');
    }
    if (!isValidUUID(candidate_id)) return badRequestResponse('Invalid candidate_id');
    if (recruiter_id && !isValidUUID(recruiter_id)) return badRequestResponse('Invalid recruiter_id');

    const ALLOWED_TYPES = ['technical', 'behavioral', 'mixed', 'coding'] as const;
    if (interview_type && !ALLOWED_TYPES.includes(interview_type as any)) {
      return badRequestResponse('Invalid interview_type');
    }

    const { data, error } = await supabase
      .from('interviews')
      .insert({
        candidate_id,
        role,
        company: company?.trim() || 'Unknown',
        department: department || null,
        interview_type: interview_type || 'technical',
        scheduled_at: scheduled_at || new Date().toISOString(),
        question_count,
        recruiter_id,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create interview' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
