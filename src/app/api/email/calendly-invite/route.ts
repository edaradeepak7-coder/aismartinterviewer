import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';
import { getDefaultSchedulingUrl } from '@/lib/calendly/server';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

/**
 * POST /api/email/calendly-invite
 * Body: { to, candidateName?, jobTitle?, schedulingUrl, message?, candidateId? }
 * Sends transactional email, creates/links candidate + scheduled interview stub, notifies.
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
    if (!profile || !RECRUITER_ROLES.has(profile.role)) return forbiddenResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const to = sanitizeString(String(body.to ?? '')).toLowerCase();
    const candidateName = sanitizeString(String(body.candidateName ?? '')).slice(0, 120);
    const jobTitle = sanitizeString(String(body.jobTitle ?? 'Interview')).slice(0, 200);
    const schedulingUrl = sanitizeString(String(body.schedulingUrl ?? '')).slice(0, 500);
    const message = sanitizeString(String(body.message ?? '')).slice(0, 8000);
    const candidateIdRaw = body.candidateId ? sanitizeString(String(body.candidateId)) : null;

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return badRequestResponse('Valid candidate email (to) is required');
    }
    if (!schedulingUrl || !/^https:\/\/calendly\.com\//i.test(schedulingUrl)) {
      return badRequestResponse('Valid Calendly schedulingUrl is required');
    }

    // Resolve scheduling URL from settings if needed
    let link = schedulingUrl;
    if (!link) {
      const { data: settings } = await supabase
        .from('recruiter_calendly_settings')
        .select('default_event_url, scheduling_url')
        .eq('recruiter_id', user.id)
        .maybeSingle();
      link = settings?.default_event_url || settings?.scheduling_url || getDefaultSchedulingUrl();
    }

    const subject = `Interview invitation – ${jobTitle}`;
    const textBody =
      message.trim() ||
      [
        `Hi ${candidateName || 'there'},`,
        '',
        `I'd like to schedule an interview for the ${jobTitle} position.`,
        '',
        'Please book a time that works for you:',
        link,
        '',
        `Best regards,`,
        profile.full_name || 'Recruiting team',
      ].join('\n');

    const sent = await sendTransactionalEmail(to, subject, textBody);
    if (!sent.ok) {
      return secureJson({ sent: false, error: sent.error || 'Email send failed' }, 502);
    }

    // Upsert candidate by email
    let candidateId = candidateIdRaw && isValidUUID(candidateIdRaw) ? candidateIdRaw : null;
    let candidateUserId: string | null = null;

    if (candidateId) {
      const { data: existing } = await supabase
        .from('candidates')
        .select('id, user_id, email')
        .eq('id', candidateId)
        .maybeSingle();
      if (existing) {
        candidateUserId = existing.user_id;
      } else {
        candidateId = null;
      }
    }

    if (!candidateId) {
      const { data: byEmail } = await supabase
        .from('candidates')
        .select('id, user_id')
        .ilike('email', to)
        .limit(1)
        .maybeSingle();
      if (byEmail) {
        candidateId = byEmail.id;
        candidateUserId = byEmail.user_id;
      } else {
        const { data: createdCand, error: candErr } = await supabase
          .from('candidates')
          .insert({
            name: candidateName || to.split('@')[0],
            email: to,
            role: jobTitle,
            avatar_initials: (candidateName || to).slice(0, 2).toUpperCase(),
          })
          .select('id, user_id')
          .single();
        if (candErr) {
          console.warn('calendly-invite candidate create:', candErr.message);
        } else {
          candidateId = createdCand.id;
          candidateUserId = createdCand.user_id;
        }
      }
    }

    let interviewId: string | null = null;
    if (candidateId) {
      const placeholderAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: interview, error: ivErr } = await supabase
        .from('interviews')
        .insert({
          candidate_id: candidateId,
          recruiter_id: user.id,
          role: jobTitle,
          company: 'Triveda',
          interview_type: 'mixed',
          status: 'scheduled',
          scheduled_at: placeholderAt,
          duration_minutes: 30,
          question_count: 0,
          answered_count: 0,
        })
        .select('id')
        .single();
      if (ivErr) {
        console.warn('calendly-invite interview create:', ivErr.message);
      } else {
        interviewId = interview.id;
      }
    }

    if (candidateUserId) {
      await supabase.from('notifications').insert({
        user_id: candidateUserId,
        type: 'interview_scheduled',
        title: 'Calendly invite sent',
        message: `Book your ${jobTitle} interview: ${link}`,
        is_read: false,
        action_url: '/invitations',
        metadata: {
          source: 'calendly_invite',
          interview_id: interviewId,
          scheduling_url: link,
        },
      });
    }

    return secureJson({
      sent: true,
      interviewId,
      candidateId,
      schedulingUrl: link,
    });
  } catch (err) {
    console.error('calendly-invite error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
