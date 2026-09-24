import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID, sanitizeString } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

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
  if (!profile || !RECRUITER_ROLES.has(profile.role)) {
    return { error: forbiddenResponse() as Response };
  }
  return { supabase, user, role: profile.role as string };
}

/**
 * GET /api/candidates/[id]
 * Enriched candidate 360 payload for recruiters.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase, user } = auth as {
      supabase: Awaited<ReturnType<typeof createClient>>;
      user: { id: string };
      role: string;
    };

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid candidate id');

    const { data: candidate, error } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) return secureJson({ error: error.message }, 500);
    if (!candidate) return secureJson({ error: 'Candidate not found' }, 404);

    const [interviewsRes, offersRes, feedbackRes, metaRes] = await Promise.all([
      supabase
        .from('interviews')
        .select(
          'id, role, company, interview_type, status, scheduled_at, completed_at, duration_minutes, overall_score, technical_score, communication_score, recommendation, recruiter_notes, recording_url, job_posting_id, created_at',
        )
        .eq('candidate_id', id)
        .order('scheduled_at', { ascending: false })
        .limit(50),
      supabase
        .from('job_offers')
        .select('id, role, company, salary_range, status, created_at, responded_at, expires_at')
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('recruiter_feedback')
        .select(
          'id, interview_id, strengths, gaps, recommendation_notes, overall_recommendation, is_confidential, created_at, recruiter_id',
        )
        .eq('candidate_id', id)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('recruiter_candidate_meta')
        .select('saved, tags, updated_at')
        .eq('recruiter_id', user.id)
        .eq('candidate_id', id)
        .maybeSingle(),
    ]);

    const interviews = interviewsRes.data || [];
    const offers = offersRes.data || [];
    const feedback = feedbackRes.error ? [] : feedbackRes.data || [];
    const meta =
      metaRes.error && /recruiter_candidate_meta|PGRST205|42P01/i.test(metaRes.error.message)
        ? null
        : metaRes.data;

    const scored = interviews.filter(
      (iv) => typeof iv.overall_score === 'number' && iv.overall_score > 0,
    );
    const avgScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((s, iv) => s + Number(iv.overall_score), 0) / scored.length,
          )
        : null;

    const notes = interviews
      .filter((iv) => iv.recruiter_notes && String(iv.recruiter_notes).trim())
      .map((iv) => ({
        id: `note-${iv.id}`,
        interview_id: iv.id,
        role: iv.role,
        company: iv.company,
        content: String(iv.recruiter_notes),
        date: iv.completed_at || iv.scheduled_at || iv.created_at,
        source: 'interview' as const,
      }));

    const activity = [
      ...interviews.map((iv) => ({
        id: `iv-${iv.id}`,
        action: `Interview ${iv.status}`,
        detail: `${iv.role}${iv.company ? ` · ${iv.company}` : ''}${
          iv.overall_score ? ` · Score ${iv.overall_score}` : ''
        }`,
        time: iv.completed_at || iv.scheduled_at || iv.created_at,
        type: 'interview' as const,
      })),
      ...offers.map((o) => ({
        id: `offer-${o.id}`,
        action: `Offer ${o.status}`,
        detail: `${o.role} at ${o.company}${o.salary_range ? ` · ${o.salary_range}` : ''}`,
        time: o.responded_at || o.created_at,
        type: 'offer' as const,
      })),
      ...feedback.map((f) => ({
        id: `fb-${f.id}`,
        action: 'Structured feedback submitted',
        detail: `${f.overall_recommendation || '—'} · ${(f.strengths || '').slice(0, 80)}`,
        time: f.created_at,
        type: 'feedback' as const,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return secureJson({
      data: {
        candidate,
        meta: meta
          ? {
              bookmarked: Boolean(meta.saved),
              tags: Array.isArray(meta.tags) ? meta.tags : [],
              updated_at: meta.updated_at,
            }
          : { bookmarked: false, tags: [], updated_at: null },
        interviews,
        offers,
        feedback,
        notes,
        activity: activity.slice(0, 40),
        stats: {
          interviewCount: interviews.length,
          completedCount: interviews.filter((iv) =>
            ['completed', 'evaluated'].includes(iv.status),
          ).length,
          offerCount: offers.length,
          avgScore,
          latestStatus: interviews[0]?.status || null,
        },
      },
    });
  } catch (err) {
    console.error('GET /api/candidates/[id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase } = auth as {
      supabase: Awaited<ReturnType<typeof createClient>>;
    };

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid candidate id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const allowedFields = ['name', 'email', 'role', 'department', 'experience_level', 'avatar_initials'];
    const updates: Record<string, string> = {};
    for (const key of allowedFields) {
      if (key in body) {
        updates[key] = sanitizeString(String(body[key] ?? '')).slice(0, 300);
      }
    }
    if (Object.keys(updates).length === 0) {
      return badRequestResponse('No valid fields to update');
    }

    const { data, error } = await supabase
      .from('candidates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ data });
  } catch (err) {
    console.error('PATCH /api/candidates/[id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireStaff();
    if ('error' in auth && auth.error) return auth.error;
    const { supabase, role } = auth as {
      supabase: Awaited<ReturnType<typeof createClient>>;
      role: string;
    };

    if (!['admin', 'super_admin', 'org_admin'].includes(role)) {
      return forbiddenResponse('Only admins can delete candidates');
    }

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid candidate id');

    const { error } = await supabase.from('candidates').delete().eq('id', id);
    if (error) return secureJson({ error: error.message }, 500);
    return secureJson({ success: true });
  } catch (err) {
    console.error('DELETE /api/candidates/[id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
