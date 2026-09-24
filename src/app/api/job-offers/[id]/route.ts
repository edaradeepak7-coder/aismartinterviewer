import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, forbiddenResponse } from '@/lib/security/apiHelpers';
import { normalizeOfferNextSteps, normalizeOfferPrepTips } from '@/lib/offers/defaults';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid offer id');

    const { data, error } = await supabase
      .from('job_offers')
      .select('*, candidates(name, email, avatar_initials)')
      .eq('id', id)
      .maybeSingle();

    if (error) return secureJson({ error: 'Failed to load offer' }, 500);
    if (!data) return secureJson({ error: 'Offer not found' }, 404);

    return secureJson({ data });
  } catch (err) {
    console.error('job-offers GET [id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/**
 * PATCH /api/job-offers/[id]
 * Candidates accept/decline; recruiters may update non-status fields on their offers.
 * Accept/decline notifies the hiring recruiter.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { id } = await params;
    if (!isValidUUID(id)) return badRequestResponse('Invalid offer id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const { data: existing, error: loadErr } = await supabase
      .from('job_offers')
      .select('*, candidates(user_id, name)')
      .eq('id', id)
      .maybeSingle();

    if (loadErr) return secureJson({ error: 'Failed to load offer' }, 500);
    if (!existing) return secureJson({ error: 'Offer not found' }, 404);

    const statusRaw = body.status != null ? sanitizeString(String(body.status)) : null;
    const isResponse = statusRaw === 'accepted' || statusRaw === 'declined';

    if (isResponse) {
      const candidateUserId =
        existing.candidates && typeof existing.candidates === 'object'
          ? (existing.candidates as { user_id?: string | null }).user_id
          : null;

      // Fallback lookup if join shape differs
      let allowed = candidateUserId === user.id;
      if (!allowed) {
        const { data: cand } = await supabase
          .from('candidates')
          .select('user_id')
          .eq('id', existing.candidate_id)
          .maybeSingle();
        allowed = cand?.user_id === user.id;
      }
      if (!allowed) return forbiddenResponse('Only the candidate can accept or decline this offer');
      if (existing.status !== 'pending') {
        return badRequestResponse('Offer has already been responded to');
      }
    } else if (existing.recruiter_id && existing.recruiter_id !== user.id) {
      return forbiddenResponse('Only the hiring recruiter can update this offer');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (isResponse) {
      updates.status = statusRaw;
      updates.responded_at = new Date().toISOString();
      if (body.candidate_feedback != null) {
        updates.candidate_feedback = sanitizeString(String(body.candidate_feedback)).slice(0, 5000) || null;
      }
      // Ensure accepted offers always have next steps / tips to show on /offer-status
      if (statusRaw === 'accepted') {
        const needsSteps = !Array.isArray(existing.next_steps) || existing.next_steps.length === 0;
        const needsTips =
          !Array.isArray(existing.interview_prep_tips) || existing.interview_prep_tips.length === 0;
        if (needsSteps) {
          updates.next_steps = normalizeOfferNextSteps([], existing.role, existing.company);
        }
        if (needsTips) {
          updates.interview_prep_tips = normalizeOfferPrepTips([], existing.role);
        }
      }
    } else {
      if ('salary_range' in body) {
        updates.salary_range = body.salary_range
          ? sanitizeString(String(body.salary_range)).slice(0, 200)
          : null;
      }
      if ('start_date' in body) {
        updates.start_date = body.start_date ? sanitizeString(String(body.start_date)).slice(0, 120) : null;
      }
      if ('offer_details' in body) {
        updates.offer_details = body.offer_details
          ? sanitizeString(String(body.offer_details)).slice(0, 10000)
          : null;
      }
      if ('expires_at' in body) {
        updates.expires_at = body.expires_at ? sanitizeString(String(body.expires_at)) : null;
      }
      if ('next_steps' in body) {
        updates.next_steps = normalizeOfferNextSteps(body.next_steps, existing.role, existing.company);
      }
      if ('interview_prep_tips' in body) {
        updates.interview_prep_tips = normalizeOfferPrepTips(body.interview_prep_tips, existing.role);
      }
    }

    const { data, error } = await supabase
      .from('job_offers')
      .update(updates)
      .eq('id', id)
      .select('*, candidates(name, email, avatar_initials)')
      .single();

    if (error) {
      console.error('job-offers PATCH:', error.message);
      return secureJson({ error: 'Failed to update offer' }, 500);
    }

    if (isResponse && existing.recruiter_id) {
      try {
        const candidateName =
          existing.candidates && typeof existing.candidates === 'object'
            ? (existing.candidates as { name?: string }).name || 'A candidate'
            : 'A candidate';
        const accepted = statusRaw === 'accepted';
        await supabase.from('notifications').insert({
          user_id: existing.recruiter_id,
          type: accepted ? 'offer_accepted' : 'offer_declined',
          title: accepted ? 'Offer accepted' : 'Offer declined',
          message: accepted
            ? `${candidateName} accepted your offer for ${existing.role} at ${existing.company}.`
            : `${candidateName} declined your offer for ${existing.role} at ${existing.company}.`,
          is_read: false,
          action_url: '/job-offers',
          metadata: {
            offer_id: id,
            candidate_id: existing.candidate_id,
            source: 'offer_response',
          },
        });
      } catch (notifErr) {
        console.warn('job-offers recruiter notify:', notifErr);
      }
    }

    return secureJson({ data });
  } catch (err) {
    console.error('job-offers PATCH [id]:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
