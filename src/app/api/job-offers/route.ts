import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { normalizeOfferNextSteps, normalizeOfferPrepTips } from '@/lib/offers/defaults';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate_id');
    const recruiterId = searchParams.get('recruiter_id');
    const status = searchParams.get('status');

    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');
    if (recruiterId && !isValidUUID(recruiterId)) return badRequestResponse('Invalid recruiter_id');

    let query = supabase
      .from('job_offers')
      .select('*, candidates(name, email, avatar_initials)')
      .order('created_at', { ascending: false });

    if (candidateId) query = query.eq('candidate_id', candidateId);
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch offers' }, 500);

    return secureJson({ data: data || [] });
  } catch (err) {
    console.error('job-offers GET:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/job-offers
 * Creates a pending offer (idempotent per interview_id when one pending already exists).
 * Seeds default next_steps / interview_prep_tips when not provided.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const interview_id = body.interview_id ? sanitizeString(String(body.interview_id)) : null;
    const candidate_id = sanitizeString(String(body.candidate_id ?? ''));
    const role = sanitizeString(String(body.role ?? ''));
    const company = sanitizeString(String(body.company ?? '')).trim() || 'Unknown';
    const department = body.department ? sanitizeString(String(body.department)) : null;
    const salary_range = body.salary_range ? sanitizeString(String(body.salary_range)) : null;
    const start_date = body.start_date ? sanitizeString(String(body.start_date)) : null;
    const offer_details = body.offer_details
      ? sanitizeString(String(body.offer_details)).slice(0, 10000)
      : null;
    const expires_at = body.expires_at
      ? sanitizeString(String(body.expires_at))
      : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    if (!candidate_id || !role) {
      return badRequestResponse('candidate_id and role are required');
    }
    if (!isValidUUID(candidate_id)) return badRequestResponse('Invalid candidate_id');
    if (interview_id && !isValidUUID(interview_id)) return badRequestResponse('Invalid interview_id');

    const next_steps = normalizeOfferNextSteps(body.next_steps, role, company);
    const interview_prep_tips = normalizeOfferPrepTips(body.interview_prep_tips, role);

    // Idempotent: one pending offer per interview
    if (interview_id) {
      const { data: existing } = await supabase
        .from('job_offers')
        .select('*')
        .eq('interview_id', interview_id)
        .eq('status', 'pending')
        .maybeSingle();
      if (existing) {
        const needsSteps = !Array.isArray(existing.next_steps) || existing.next_steps.length === 0;
        const needsTips =
          !Array.isArray(existing.interview_prep_tips) || existing.interview_prep_tips.length === 0;
        if (needsSteps || needsTips) {
          const { data: hydrated } = await supabase
            .from('job_offers')
            .update({
              next_steps: needsSteps ? next_steps : existing.next_steps,
              interview_prep_tips: needsTips ? interview_prep_tips : existing.interview_prep_tips,
              updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
            .select()
            .single();
          return secureJson({ data: hydrated || existing, reused: true });
        }
        return secureJson({ data: existing, reused: true });
      }
    }

    const { data, error } = await supabase
      .from('job_offers')
      .insert({
        interview_id: interview_id || null,
        candidate_id,
        recruiter_id: user.id,
        role,
        company,
        department,
        salary_range,
        start_date,
        offer_details,
        status: 'pending',
        expires_at,
        next_steps,
        interview_prep_tips,
      })
      .select()
      .single();

    if (error) {
      console.error('job-offers insert:', error.message);
      return secureJson({ error: 'Failed to create offer' }, 500);
    }

    try {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('user_id, name')
        .eq('id', candidate_id)
        .maybeSingle();
      if (candidate?.user_id) {
        await supabase.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'offer_received',
          title: `Job offer: ${role}`,
          message: `${company} has extended an offer for ${role}. Review it in Job Offers.`,
          is_read: false,
          action_url: '/job-offers',
          metadata: {
            offer_id: data.id,
            interview_id: interview_id,
            source: 'job_offer_created',
          },
        });
      }
    } catch (notifErr) {
      console.warn('job-offers notify:', notifErr);
    }

    return secureJson({ data, reused: false }, 201);
  } catch (err) {
    console.error('job-offers POST:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
