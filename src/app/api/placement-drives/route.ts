import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
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

/**
 * GET /api/placement-drives?status=&q=
 * POST create drive
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

    const status = request.nextUrl.searchParams.get('status');
    const q = sanitizeString(request.nextUrl.searchParams.get('q') || '').slice(0, 100);
    if (status && status !== 'all' && !STATUSES.has(status)) {
      return badRequestResponse('Invalid status');
    }

    const isAdmin = ['admin', 'super_admin', 'org_admin'].includes(profile.role);

    let query = supabase
      .from('placement_drives')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status && status !== 'all') query = query.eq('status', status);
    if (!isAdmin) query = query.eq('created_by', user.id);

    const { data, error } = await query;
    if (error) return secureJson({ error: error.message }, 500);

    let drives = data || [];
    if (q) {
      const lower = q.toLowerCase();
      drives = drives.filter(
        (d) =>
          String(d.company_name || '').toLowerCase().includes(lower) ||
          String(d.role_title || '').toLowerCase().includes(lower) ||
          String(d.location || '').toLowerCase().includes(lower),
      );
    }

    const driveIds = drives.map((d) => d.id as string);
    const stageCounts: Record<string, Record<string, number>> = {};
    if (driveIds.length) {
      const { data: enrollments } = await supabase
        .from('placement_drive_candidates')
        .select('drive_id, stage')
        .in('drive_id', driveIds);
      for (const e of enrollments || []) {
        const did = e.drive_id as string;
        if (!stageCounts[did]) stageCounts[did] = {};
        const st = String(e.stage || 'registered');
        stageCounts[did][st] = (stageCounts[did][st] || 0) + 1;
      }
    }

    const enriched = drives.map((d) => ({
      ...d,
      enrollment_count: Object.values(stageCounts[d.id as string] || {}).reduce(
        (a, b) => a + b,
        0,
      ),
      stage_counts: stageCounts[d.id as string] || {},
    }));

    const kpis = {
      activeDrives: enriched.filter((d) => d.status === 'active').length,
      totalSelected: enriched.reduce((s, d) => s + (Number(d.selected_count) || 0), 0),
      totalDrives: enriched.length,
      completedDrives: enriched.filter((d) => d.status === 'completed').length,
    };

    return secureJson({ data: enriched, kpis });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}

export async function POST(request: NextRequest) {
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON');
    }

    const company_name = sanitizeString(String(body.company_name ?? '')).slice(0, 200);
    const role_title = sanitizeString(String(body.role_title ?? '')).slice(0, 200);
    const location = sanitizeString(String(body.location ?? '')).slice(0, 200) || null;
    const notes = sanitizeString(String(body.notes ?? '')).slice(0, 2000) || null;
    const drive_date = sanitizeString(String(body.drive_date ?? '')).slice(0, 20) || null;
    const status = STATUSES.has(String(body.status))
      ? String(body.status)
      : 'active';
    const package_lpa_min =
      typeof body.package_lpa_min === 'number' ? Math.max(0, body.package_lpa_min) : null;
    const package_lpa_max =
      typeof body.package_lpa_max === 'number' ? Math.max(0, body.package_lpa_max) : null;
    const institution_id = body.institution_id
      ? sanitizeString(String(body.institution_id))
      : null;
    const job_posting_id = body.job_posting_id
      ? sanitizeString(String(body.job_posting_id))
      : null;

    if (!company_name) return badRequestResponse('company_name is required');
    if (institution_id && !isValidUUID(institution_id)) {
      return badRequestResponse('Invalid institution_id');
    }
    if (job_posting_id && !isValidUUID(job_posting_id)) {
      return badRequestResponse('Invalid job_posting_id');
    }

    const { data, error } = await supabase
      .from('placement_drives')
      .insert({
        company_name,
        role_title: role_title || 'Open Role',
        location,
        package_lpa_min,
        package_lpa_max,
        drive_date: drive_date || null,
        status,
        notes,
        institution_id,
        job_posting_id,
        created_by: user.id,
        selected_count: 0,
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
