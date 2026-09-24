import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidEmail, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import { encryptFields, ENCRYPTED_FIELDS } from '@/lib/security/encryption';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';

const STAFF = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);
const MAX_ROWS = 50;

type SlotInput = {
  email: string;
  name: string;
  experience?: string;
  date: string;
  time: string;
  duration: number;
};

function endTimeFrom(start: string, durationMins: number): string {
  const [h, m] = start.split(':').map(Number);
  const end = h * 60 + m + durationMins;
  return `${String(Math.floor(end / 60) % 24).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}:00`;
}

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

/**
 * POST /api/recruiter/bulk-import
 * Body: {
 *   role: string,
 *   job_posting_id?: string,
 *   company?: string,
 *   send_confirmation?: boolean,
 *   slots: [{ email, name, experience?, date, time, duration }]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !STAFF.has(profile.role)) return forbiddenResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const role = sanitizeString(String(body.role ?? '')).slice(0, 200) || 'Interview';
    const company = sanitizeString(String(body.company ?? 'Triveda')).slice(0, 200);
    const jobPostingId = body.job_posting_id
      ? sanitizeString(String(body.job_posting_id))
      : null;
    if (jobPostingId && !isValidUUID(jobPostingId)) {
      return badRequestResponse('Invalid job_posting_id');
    }
    const sendConfirmation = Boolean(body.send_confirmation);

    const slotsRaw = Array.isArray(body.slots) ? body.slots : [];
    if (slotsRaw.length === 0) return badRequestResponse('slots required');
    if (slotsRaw.length > MAX_ROWS) {
      return badRequestResponse(`Maximum ${MAX_ROWS} candidates per import`);
    }

    const slots: SlotInput[] = [];
    for (const raw of slotsRaw) {
      const s = raw as Record<string, unknown>;
      const email = sanitizeString(String(s.email ?? '')).toLowerCase();
      const name = sanitizeString(String(s.name ?? '')).slice(0, 200);
      const date = sanitizeString(String(s.date ?? ''));
      const time = sanitizeString(String(s.time ?? '')).slice(0, 5);
      const duration = Math.min(180, Math.max(15, Number(s.duration) || 45));
      const experience = s.experience
        ? sanitizeString(String(s.experience)).slice(0, 120)
        : undefined;

      if (!name || !email || !isValidEmail(email)) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      if (!/^\d{2}:\d{2}$/.test(time)) continue;
      slots.push({ email, name, experience, date, time, duration });
    }

    if (slots.length === 0) {
      return badRequestResponse('No valid slots after validation');
    }

    let success = 0;
    let failed = 0;
    let conflicts = 0;
    let emailsSent = 0;
    let interviewsCreated = 0;
    const candidateIds: string[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const slot of slots) {
      try {
        // Conflict check on owned slots
        const { data: existing } = await supabase
          .from('recruiter_availability')
          .select('id')
          .eq('recruiter_id', user.id)
          .eq('slot_date', slot.date)
          .eq('start_time', `${slot.time}:00`)
          .in('status', ['available', 'booked'])
          .maybeSingle();

        if (existing) conflicts++;

        const initials = slot.name
          .split(/\s+/)
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase();

        const plainPayload = {
          name: slot.name,
          email: slot.email,
          role,
          department: null as string | null,
          experience_level: slot.experience || null,
          avatar_initials: initials || null,
        };
        let encryptedPayload: Record<string, unknown> = { ...plainPayload };
        try {
          encryptedPayload = (await encryptFields(
            plainPayload as never,
            ENCRYPTED_FIELDS.candidate as never,
          )) as Record<string, unknown>;
          encryptedPayload.pii_encrypted = true;
        } catch {
          // encryption optional if key missing
        }

        const { data: cand, error: candErr } = await supabase
          .from('candidates')
          .upsert(encryptedPayload, { onConflict: 'email' })
          .select('id, user_id, email, name')
          .single();

        if (candErr || !cand) {
          failed++;
          errors.push({ email: slot.email, error: candErr?.message || 'Candidate upsert failed' });
          continue;
        }

        candidateIds.push(cand.id);

        const startTime = `${slot.time}:00`;
        const endTime = endTimeFrom(slot.time, slot.duration);

        const { error: slotErr } = await supabase.from('recruiter_availability').insert({
          recruiter_id: user.id,
          slot_date: slot.date,
          start_time: startTime,
          end_time: endTime,
          duration_minutes: slot.duration,
          status: 'available',
          notes: `Bulk import — ${role}`,
        });

        if (slotErr) {
          // Candidate saved; slot failed — still count partial success
          errors.push({ email: slot.email, error: `Slot: ${slotErr.message}` });
        }

        const scheduledAt = new Date(`${slot.date}T${startTime}`);
        const scheduledIso = Number.isNaN(scheduledAt.getTime())
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : scheduledAt.toISOString();

        const interviewRow: Record<string, unknown> = {
          candidate_id: cand.id,
          recruiter_id: user.id,
          role,
          company,
          interview_type: 'mixed',
          status: 'scheduled',
          scheduled_at: scheduledIso,
          duration_minutes: slot.duration,
          question_count: 0,
          answered_count: 0,
        };
        if (jobPostingId) interviewRow.job_posting_id = jobPostingId;

        const { data: interview, error: ivErr } = await supabase
          .from('interviews')
          .insert(interviewRow)
          .select('id')
          .single();

        if (ivErr) {
          errors.push({ email: slot.email, error: `Interview: ${ivErr.message}` });
        } else {
          interviewsCreated++;
          if (cand.user_id) {
            await supabase.from('notifications').insert({
              user_id: cand.user_id,
              type: 'interview_scheduled',
              title: 'Interview scheduled',
              message: `You have been scheduled for ${role} on ${slot.date} at ${slot.time}.`,
              is_read: false,
              action_url: '/invitations',
              metadata: {
                interview_id: interview?.id,
                candidate_id: cand.id,
                source: 'recruiter_bulk_import',
              },
            });
          }
        }

        if (sendConfirmation) {
          const when = `${slot.date} ${slot.time}`;
          const inviteUrl = `${siteBase()}/invitations`;
          const subject = `Interview invitation — ${role}`;
          const textBody = [
            `Hi ${cand.name || slot.name},`,
            '',
            `You've been invited to interview for ${role} at ${company}.`,
            `Proposed time: ${when} (${slot.duration} min).`,
            '',
            `View and confirm your invitation:`,
            inviteUrl,
            '',
            `Best regards,`,
            profile.full_name || 'Recruiting team',
          ].join('\n');

          const sent = await sendTransactionalEmail(slot.email, subject, textBody);
          if (sent.ok) emailsSent++;
        }

        success++;
      } catch (err) {
        failed++;
        errors.push({
          email: slot.email,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return secureJson({
      data: {
        success,
        failed,
        conflicts,
        emailsSent,
        interviewsCreated,
        candidateIds,
        errors: errors.slice(0, 20),
      },
    });
  } catch (err) {
    console.error('bulk-import error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
