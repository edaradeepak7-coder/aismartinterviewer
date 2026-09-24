import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID, isValidEmail } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

const STAFF = new Set([
  'admin',
  'super_admin',
  'org_admin',
  'recruiter',
  'institution_admin',
  'faculty',
]);

const STATUSES = new Set(['draft', 'active', 'completed', 'cancelled']);
const STAGES = new Set([
  'registered',
  'shortlisted',
  'interviewing',
  'selected',
  'rejected',
  'offered',
]);

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: unauthorizedResponse() as Response };
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !STAFF.has(profile.role)) return { error: forbiddenResponse() as Response };
  return { supabase, user, profile };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase } = auth as Awaited<ReturnType<typeof requireStaff>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const { data: drive, error } = await supabase
      .from('placement_drives')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) return secureJson({ error: error.message }, 500);
    if (!drive) return secureJson({ error: 'Not found' }, 404);

    const { data: candidates } = await supabase
      .from('placement_drive_candidates')
      .select('*')
      .eq('drive_id', id)
      .order('created_at', { ascending: false });

    return secureJson({ data: { ...drive, candidates: candidates || [] } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase } = auth as Awaited<ReturnType<typeof requireStaff>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    // Enroll candidate
    if (body.enroll) {
      const enroll = body.enroll as Record<string, unknown>;
      const candidate_name = sanitizeString(String(enroll.candidate_name ?? '')).slice(0, 120);
      const candidate_email = sanitizeString(String(enroll.candidate_email ?? ''))
        .toLowerCase()
        .slice(0, 254);
      const stage = STAGES.has(String(enroll.stage))
        ? String(enroll.stage)
        : 'registered';
      const candidate_id = enroll.candidate_id
        ? sanitizeString(String(enroll.candidate_id))
        : null;
      if (!candidate_name && !candidate_email) {
        return badRequestResponse('candidate_name or candidate_email required');
      }
      if (candidate_email && !isValidEmail(candidate_email)) {
        return badRequestResponse('Invalid candidate_email');
      }
      if (candidate_id && !isValidUUID(candidate_id)) {
        return badRequestResponse('Invalid candidate_id');
      }

      const { data: enrolled, error: enErr } = await supabase
        .from('placement_drive_candidates')
        .insert({
          drive_id: id,
          candidate_id,
          candidate_name: candidate_name || 'Candidate',
          candidate_email: candidate_email || '',
          stage,
          package_lpa:
            typeof enroll.package_lpa === 'number' ? Math.max(0, enroll.package_lpa) : null,
        })
        .select()
        .single();
      if (enErr) return secureJson({ error: enErr.message }, 500);
      return secureJson({ data: enrolled }, 201);
    }

    // Update enrollment stage
    if (body.enrollment_id && body.stage) {
      const enrollment_id = sanitizeString(String(body.enrollment_id));
      const stage = sanitizeString(String(body.stage));
      if (!isValidUUID(enrollment_id)) return badRequestResponse('Invalid enrollment_id');
      if (!STAGES.has(stage)) return badRequestResponse('Invalid stage');

      const updates: Record<string, unknown> = { stage };
      if (typeof body.package_lpa === 'number') {
        updates.package_lpa = Math.max(0, body.package_lpa);
      }

      const { data: updated, error: upErr } = await supabase
        .from('placement_drive_candidates')
        .update(updates)
        .eq('id', enrollment_id)
        .eq('drive_id', id)
        .select()
        .single();
      if (upErr) return secureJson({ error: upErr.message }, 500);
      return secureJson({ data: updated });
    }

    // Update drive fields
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if ('company_name' in body) {
      const v = sanitizeString(String(body.company_name ?? '')).slice(0, 200);
      if (!v) return badRequestResponse('company_name cannot be empty');
      updates.company_name = v;
    }
    if ('role_title' in body) {
      updates.role_title = sanitizeString(String(body.role_title ?? '')).slice(0, 200);
    }
    if ('location' in body) {
      updates.location = sanitizeString(String(body.location ?? '')).slice(0, 200) || null;
    }
    if ('notes' in body) {
      updates.notes = sanitizeString(String(body.notes ?? '')).slice(0, 2000) || null;
    }
    if ('drive_date' in body) {
      updates.drive_date = sanitizeString(String(body.drive_date ?? '')).slice(0, 20) || null;
    }
    if ('status' in body) {
      const st = String(body.status);
      if (!STATUSES.has(st)) return badRequestResponse('Invalid status');
      updates.status = st;
    }
    if (typeof body.package_lpa_min === 'number') {
      updates.package_lpa_min = Math.max(0, body.package_lpa_min);
    }
    if (typeof body.package_lpa_max === 'number') {
      updates.package_lpa_max = Math.max(0, body.package_lpa_max);
    }

    const { data, error } = await supabase
      .from('placement_drives')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase } = auth as Awaited<ReturnType<typeof requireStaff>> & {
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid id');

    const { error } = await supabase.from('placement_drives').delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
