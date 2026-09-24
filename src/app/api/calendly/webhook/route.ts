import { NextRequest } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { secureJson } from '@/lib/security/apiHelpers';
import {
  assertCalendlyWebhookAuth,
  fetchCalendlyEvent,
} from '@/lib/calendly/server';

/**
 * POST /api/calendly/webhook
 * Calendly invitee.created / invitee.canceled → sync interviews + notify.
 * Auth: x-calendly-webhook-secret or Bearer = CALENDLY_WEBHOOK_SECRET (or CRON_SECRET).
 */
export async function POST(request: NextRequest) {
  if (!assertCalendlyWebhookAuth(request)) {
    return secureJson({ error: 'Forbidden' }, 403);
  }

  try {
    let body: {
      event?: string;
      payload?: Record<string, unknown>;
    };
    try {
      body = await request.json();
    } catch {
      return secureJson({ error: 'Invalid JSON' }, 400);
    }

    const eventName = String(body.event || '');
    const payload = body.payload || {};
    const inviteeUri = String(payload.uri || '');
    const inviteeEmail = String(payload.email || '').toLowerCase().trim();
    const inviteeName = String(payload.name || '').trim();
    const eventUri = String(payload.event || '');

    if (!eventName) return secureJson({ error: 'Missing event' }, 400);

    const supabase = createServiceRoleClient();

    if (eventName === 'invitee.canceled') {
      if (inviteeUri) {
        const { data: existing } = await supabase
          .from('interviews')
          .select('id, candidate_id, recruiter_id, role')
          .eq('calendly_invitee_uri', inviteeUri)
          .maybeSingle();
        if (existing) {
          await supabase
            .from('interviews')
            .update({ status: 'archived' })
            .eq('id', existing.id);

          if (existing.recruiter_id) {
            await supabase.from('notifications').insert({
              user_id: existing.recruiter_id,
              type: 'system',
              title: 'Calendly booking canceled',
              message: `${inviteeName || inviteeEmail || 'Candidate'} canceled ${existing.role || 'interview'}.`,
              is_read: false,
              action_url: '/calendly-scheduling',
              metadata: { interview_id: existing.id, source: 'calendly_webhook' },
            });
          }
        }
      }
      return secureJson({ ok: true, handled: 'invitee.canceled' });
    }

    if (eventName !== 'invitee.created') {
      return secureJson({ ok: true, ignored: eventName });
    }

    if (!inviteeEmail && !inviteeUri) {
      return secureJson({ error: 'Missing invitee email/uri' }, 400);
    }

    let startTime: string | null = null;
    let endTime: string | null = null;
    let durationMinutes = 30;
    if (eventUri) {
      const { event } = await fetchCalendlyEvent(eventUri);
      if (event?.start_time) startTime = event.start_time;
      if (event?.end_time) endTime = event.end_time;
      if (startTime && endTime) {
        durationMinutes = Math.max(
          15,
          Math.round((new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000),
        );
      }
    }

    // Idempotent: already synced
    if (inviteeUri) {
      const { data: byInvitee } = await supabase
        .from('interviews')
        .select('id')
        .eq('calendly_invitee_uri', inviteeUri)
        .maybeSingle();
      if (byInvitee) {
        if (startTime) {
          await supabase
            .from('interviews')
            .update({
              scheduled_at: startTime,
              duration_minutes: durationMinutes,
              calendly_event_uri: eventUri || null,
              status: 'scheduled',
            })
            .eq('id', byInvitee.id);
        }
        return secureJson({ ok: true, interviewId: byInvitee.id, reused: true });
      }
    }

    // Match pending interview by candidate email (recent Calendly invite stub)
    let interviewId: string | null = null;
    let recruiterId: string | null = null;
    let candidateUserId: string | null = null;
    let role = 'Interview';

    if (inviteeEmail) {
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id, user_id, name')
        .ilike('email', inviteeEmail)
        .limit(1)
        .maybeSingle();

      if (candidate) {
        candidateUserId = candidate.user_id;
        const { data: pending } = await supabase
          .from('interviews')
          .select('id, recruiter_id, role')
          .eq('candidate_id', candidate.id)
          .eq('status', 'scheduled')
          .is('calendly_invitee_uri', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pending) {
          interviewId = pending.id;
          recruiterId = pending.recruiter_id;
          role = pending.role || role;
          await supabase
            .from('interviews')
            .update({
              scheduled_at: startTime || new Date().toISOString(),
              duration_minutes: durationMinutes,
              calendly_event_uri: eventUri || null,
              calendly_invitee_uri: inviteeUri || null,
              status: 'scheduled',
            })
            .eq('id', pending.id);
        } else if (startTime) {
          // Create interview under last recruiter who has Calendly settings — fallback skip
          const { data: anySettings } = await supabase
            .from('recruiter_calendly_settings')
            .select('recruiter_id')
            .limit(1)
            .maybeSingle();
          recruiterId = anySettings?.recruiter_id || null;
          if (recruiterId) {
            const { data: created } = await supabase
              .from('interviews')
              .insert({
                candidate_id: candidate.id,
                recruiter_id: recruiterId,
                role: 'Calendly Interview',
                company: 'Triveda',
                interview_type: 'mixed',
                status: 'scheduled',
                scheduled_at: startTime,
                duration_minutes: durationMinutes,
                calendly_event_uri: eventUri || null,
                calendly_invitee_uri: inviteeUri || null,
                question_count: 0,
                answered_count: 0,
              })
              .select('id')
              .single();
            interviewId = created?.id || null;
          }
        }
      }
    }

    const when = startTime
      ? new Date(startTime).toLocaleString('en-IN', {
          dateStyle: 'medium',
          timeStyle: 'short',
          timeZone: 'Asia/Kolkata',
        })
      : 'the scheduled time';

    if (recruiterId) {
      await supabase.from('notifications').insert({
        user_id: recruiterId,
        type: 'booking_confirmed',
        title: 'Calendly booking confirmed',
        message: `${inviteeName || inviteeEmail} booked ${role} for ${when}.`,
        is_read: false,
        action_url: '/calendly-scheduling',
        metadata: {
          interview_id: interviewId,
          calendly_invitee_uri: inviteeUri,
          source: 'calendly_webhook',
        },
      });
    }

    if (candidateUserId) {
      await supabase.from('notifications').insert({
        user_id: candidateUserId,
        type: 'booking_confirmed',
        title: 'Interview time confirmed',
        message: `Your ${role} is confirmed for ${when}.`,
        is_read: false,
        action_url: '/invitations',
        metadata: {
          interview_id: interviewId,
          calendly_invitee_uri: inviteeUri,
          source: 'calendly_webhook',
        },
      });
    }

    return secureJson({
      ok: true,
      interviewId,
      scheduled_at: startTime,
    });
  } catch (err) {
    console.error('calendly webhook error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
