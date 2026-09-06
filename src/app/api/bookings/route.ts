import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate_id');

    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');

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

    const slot_id = sanitizeString(body.slot_id);
    const candidate_id = sanitizeString(body.candidate_id);
    const interview_id = body.interview_id ? sanitizeString(body.interview_id) : null;
    const notes = body.notes ? sanitizeString(body.notes).slice(0, 1000) : null;

    if (!slot_id || !candidate_id) {
      return badRequestResponse('slot_id and candidate_id are required');
    }
    if (!isValidUUID(slot_id)) return badRequestResponse('Invalid slot_id');
    if (!isValidUUID(candidate_id)) return badRequestResponse('Invalid candidate_id');
    if (interview_id && !isValidUUID(interview_id)) return badRequestResponse('Invalid interview_id');

    const { error: slotError } = await supabase
      .from('recruiter_availability')
      .update({ status: 'booked', updated_at: new Date().toISOString() })
      .eq('id', slot_id);

    if (slotError) return secureJson({ error: 'Failed to update slot' }, 500);

    const { data, error } = await supabase
      .from('interview_bookings')
      .insert({
        slot_id,
        candidate_id,
        interview_id,
        notes,
        confirmed: true,
      })
      .select('*, recruiter_availability(*)')
      .single();

    if (error) return secureJson({ error: 'Failed to create booking' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
