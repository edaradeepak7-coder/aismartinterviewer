import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid assessment id');

    const { data, error } = await supabase
      .from('assessments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return secureJson({ error: 'Assessment not found' }, 404);
    return secureJson({ data });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid assessment id');

    let body: any;
    try { body = await request.json(); } catch { return badRequestResponse('Invalid JSON'); }

    const ALLOWED_STATUSES = ['draft', 'published', 'closed'];
    const allowedFields = ['title', 'description', 'duration', 'total_points', 'status', 'questions', 'tags'];
    const updates: Record<string, any> = { updated_at: new Date().toISOString() };

    for (const key of allowedFields) {
      if (!(key in body)) continue;
      if (key === 'title') updates[key] = sanitizeString(body[key]).slice(0, 200);
      else if (key === 'description') updates[key] = sanitizeString(body[key]).slice(0, 2000);
      else if (key === 'status' && ALLOWED_STATUSES.includes(body[key])) updates[key] = body[key];
      else if (['duration', 'total_points'].includes(key) && typeof body[key] === 'number') updates[key] = body[key];
      else if (['questions', 'tags'].includes(key) && Array.isArray(body[key])) updates[key] = body[key];
    }

    const { data, error } = await supabase
      .from('assessments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to update assessment' }, 500);
    return secureJson({ data });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const ADMIN_ROLES = ['super_admin', 'institution_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty'];
    if (!profile || !ADMIN_ROLES.includes(profile.role)) return forbiddenResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid assessment id');

    const { error } = await supabase.from('assessments').delete().eq('id', id);
    if (error) return secureJson({ error: 'Failed to delete assessment' }, 500);

    return secureJson({ success: true });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
