import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    let candidateId = searchParams.get('candidate_id');

    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');

    if (!candidateId) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (candidate?.id) candidateId = candidate.id;
    }

    let query = supabase
      .from('interview_bookings')
      .select('*, recruiter_availability(*, user_profiles(full_name, email))')
      .order('created_at', { ascending: false });

    if (candidateId) query = query.eq('candidate_id', candidateId);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch bookings' }, 500);

    return secureJson({ data: data || [] });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/**
 * POST /api/bookings
 * Creates booking (+ optional interview) and attributes to job_posting when provided.
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

    const slot_id = sanitizeString(String(body.slot_id ?? ''));
    const candidate_id = sanitizeString(String(body.candidate_id ?? ''));
    let interview_id = body.interview_id ? sanitizeString(String(body.interview_id)) : null;
    const notes = body.notes ? sanitizeString(String(body.notes)).slice(0, 1000) : null;
    const job_posting_id = body.job_posting_id ? sanitizeString(String(body.job_posting_id)) : null;
    const confirmed = body.confirmed !== false; // default true for candidate self-book

    if (!slot_id || !candidate_id) {
      return badRequestResponse('slot_id and candidate_id are required');
    }
    if (!isValidUUID(slot_id)) return badRequestResponse('Invalid slot_id');
    if (!isValidUUID(candidate_id)) return badRequestResponse('Invalid candidate_id');
    if (interview_id && !isValidUUID(interview_id)) return badRequestResponse('Invalid interview_id');
    if (job_posting_id && !isValidUUID(job_posting_id)) return badRequestResponse('Invalid job_posting_id');

    // Candidate must own the candidate row
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, user_id, name')
      .eq('id', candidate_id)
      .maybeSingle();
    if (!candidate || candidate.user_id !== user.id) {
      return unauthorizedResponse();
    }

    const { data: slot, error: slotLoadErr } = await supabase
      .from('recruiter_availability')
      .select('id, recruiter_id, slot_date, start_time, end_time, duration_minutes, status')
      .eq('id', slot_id)
      .maybeSingle();

    if (slotLoadErr || !slot) return secureJson({ error: 'Slot not found' }, 404);
    if (slot.status !== 'available') {
      return badRequestResponse('Slot is no longer available');
    }

    let job: {
      id: string;
      title: string;
      department: string | null;
      created_by: string | null;
      user_profiles?: { company_name?: string | null } | null;
    } | null = null;

    if (job_posting_id) {
      const { data: jobRow, error: jobErr } = await supabase
        .from('job_postings')
        .select('id, title, department, created_by, user_profiles(company_name)')
        .eq('id', job_posting_id)
        .maybeSingle();
      if (jobErr || !jobRow) return badRequestResponse('Job posting not found');
      job = jobRow as typeof job;

      if (job.created_by && job.created_by !== slot.recruiter_id) {
        return badRequestResponse('Selected slot does not belong to this job’s recruiter');
      }
    }

    // Create interview if caller didn’t pass one
    if (!interview_id) {
      const scheduledAt = new Date(`${slot.slot_date}T${slot.start_time}`).toISOString();
      const company =
        job?.user_profiles?.company_name?.trim() ||
        sanitizeString(String(body.company ?? '')).trim() ||
        'Unknown';
      const role = job?.title || sanitizeString(String(body.role ?? '')).trim() || 'General Interview';

      const interviewInsert: Record<string, unknown> = {
        candidate_id,
        recruiter_id: slot.recruiter_id,
        role,
        company,
        department: job?.department || null,
        interview_type: 'technical',
        status: 'scheduled',
        scheduled_at: scheduledAt,
        duration_minutes: slot.duration_minutes,
      };
      if (job_posting_id) interviewInsert.job_posting_id = job_posting_id;

      const { data: interviewData, error: interviewError } = await supabase
        .from('interviews')
        .insert(interviewInsert)
        .select('id')
        .single();

      if (interviewError) {
        console.error('bookings create interview:', interviewError.message);
        // Continue without interview if column missing? Prefer fail soft only for job_posting_id
        if (/job_posting_id/i.test(interviewError.message) && job_posting_id) {
          delete interviewInsert.job_posting_id;
          const retry = await supabase.from('interviews').insert(interviewInsert).select('id').single();
          if (!retry.error && retry.data) interview_id = retry.data.id;
        }
      } else if (interviewData) {
        interview_id = interviewData.id;
      }
    }

    const { error: slotError } = await supabase
      .from('recruiter_availability')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('id', slot_id)
      .eq('status', 'available');

    if (slotError) return secureJson({ error: 'Failed to update slot' }, 500);

    const bookingInsert: Record<string, unknown> = {
      slot_id,
      candidate_id,
      interview_id,
      notes,
      confirmed,
    };
    if (job_posting_id) bookingInsert.job_posting_id = job_posting_id;

    let { data, error } = await supabase
      .from('interview_bookings')
      .insert(bookingInsert)
      .select('*, recruiter_availability(*)')
      .single();

    if (error && /job_posting_id/i.test(error.message) && job_posting_id) {
      delete bookingInsert.job_posting_id;
      ({ data, error } = await supabase
        .from('interview_bookings')
        .insert(bookingInsert)
        .select('*, recruiter_availability(*)')
        .single());
    }

    if (error || !data) {
      console.error('bookings insert:', error?.message);
      // Best-effort rollback slot
      await supabase
        .from('recruiter_availability')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', slot_id);
      return secureJson({ error: 'Failed to create booking' }, 500);
    }

    // Bump applications_count via SECURITY DEFINER RPC
    if (job_posting_id) {
      try {
        const { error: rpcErr } = await supabase.rpc('increment_job_applications', {
          p_job_id: job_posting_id,
        });
        if (rpcErr) console.warn('increment_job_applications:', rpcErr.message);
      } catch (rpcCatch) {
        console.warn('increment_job_applications failed:', rpcCatch);
      }
    }

    // Notify candidate
    try {
      if (candidate.user_id) {
        await supabase.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'interview_scheduled',
          title: 'Interview booking confirmed',
          message: job
            ? `Your slot for ${job.title} is booked. Review it under Invitations.`
            : notes
              ? `Your interview slot is booked. Note: ${notes.slice(0, 120)}`
              : 'Your interview slot has been booked. Review it under Invitations.',
          is_read: false,
          action_url: '/invitations',
          metadata: {
            booking_id: data.id,
            slot_id,
            job_posting_id,
            interview_id,
          },
        });
      }
    } catch {
      // non-blocking
    }

    // Notify recruiter
    try {
      if (slot.recruiter_id) {
        const when = `${slot.slot_date} · ${String(slot.start_time).slice(0, 5)}`;
        await supabase.from('notifications').insert({
          user_id: slot.recruiter_id,
          type: 'booking_confirmed',
          title: job ? `New applicant: ${job.title}` : 'New interview booking',
          message: `${candidate.name || 'A candidate'} booked ${when}${job ? ` for ${job.title}` : ''}.`,
          is_read: false,
          action_url: '/interview-calendar',
          metadata: {
            booking_id: data.id,
            candidate_id,
            job_posting_id,
            interview_id,
          },
        });
      }
    } catch {
      // non-blocking
    }

    return secureJson({ data, interview_id }, 201);
  } catch (err) {
    console.error('bookings POST:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
