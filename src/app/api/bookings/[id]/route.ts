import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, notFoundResponse } from '@/lib/security/apiHelpers';

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
    if (!isValidUUID(id)) return badRequestResponse('Invalid booking id');

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (typeof body.confirmed === 'boolean') updates.confirmed = body.confirmed;
    if (typeof body.notes === 'string') updates.notes = String(body.notes).slice(0, 1000);
    if (body.interview_id && isValidUUID(String(body.interview_id))) {
      updates.interview_id = body.interview_id;
    }

    if (Object.keys(updates).length <= 1) {
      return badRequestResponse('No valid fields to update');
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    let query = supabase.from('interview_bookings').update(updates).eq('id', id);
    if (candidate?.id) query = query.eq('candidate_id', candidate.id);

    const { data, error } = await query
      .select('*, recruiter_availability(recruiter_id, slot_date, start_time, end_time)')
      .single();
    if (error) return secureJson({ error: 'Failed to update booking' }, 500);
    if (!data) return notFoundResponse('Booking not found');

    if (updates.confirmed === true) {
      try {
        const slot = data.recruiter_availability as
          | { recruiter_id?: string; slot_date?: string; start_time?: string }
          | null;
        if (slot?.recruiter_id) {
          const when = slot.slot_date
            ? `${slot.slot_date}${slot.start_time ? ` · ${String(slot.start_time).slice(0, 5)}` : ''}`
            : 'your open slot';
          await supabase.from('notifications').insert({
            user_id: slot.recruiter_id,
            type: 'booking_confirmed',
            title: 'Booking confirmed',
            message: `${candidate?.name || 'A candidate'} confirmed a booking for ${when}.`,
            is_read: false,
            action_url: '/interview-calendar',
            metadata: {
              booking_id: id,
              candidate_id: data.candidate_id,
              source: 'booking_confirmed',
            },
          });
        }
      } catch (notifErr) {
        console.warn('booking confirm notify:', notifErr);
      }
    }

    return secureJson({ data });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(
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
    if (!isValidUUID(id)) return badRequestResponse('Invalid booking id');

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, name')
      .eq('user_id', user.id)
      .maybeSingle();

    const { data: booking } = await supabase
      .from('interview_bookings')
      .select('slot_id, candidate_id, recruiter_availability(recruiter_id)')
      .eq('id', id)
      .maybeSingle();

    if (!booking) return notFoundResponse('Booking not found');
    if (candidate?.id && booking.candidate_id !== candidate.id) {
      return unauthorizedResponse();
    }

    const { error } = await supabase.from('interview_bookings').delete().eq('id', id);
    if (error) return secureJson({ error: 'Failed to delete booking' }, 500);

    if (booking.slot_id) {
      await supabase
        .from('recruiter_availability')
        .update({ status: 'available', updated_at: new Date().toISOString() })
        .eq('id', booking.slot_id);
    }

    try {
      const slot = booking.recruiter_availability as { recruiter_id?: string } | null;
      if (slot?.recruiter_id) {
        await supabase.from('notifications').insert({
          user_id: slot.recruiter_id,
          type: 'system',
          title: 'Booking declined',
          message: `${candidate?.name || 'A candidate'} declined or cancelled a booking.`,
          is_read: false,
          action_url: '/interview-calendar',
          metadata: { booking_id: id, source: 'booking_declined' },
        });
      }
    } catch (notifErr) {
      console.warn('booking decline notify:', notifErr);
    }

    return secureJson({ success: true });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
