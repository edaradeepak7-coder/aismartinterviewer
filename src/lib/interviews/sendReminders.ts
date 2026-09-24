import type { SupabaseClient } from '@supabase/supabase-js';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';

export type ReminderInterviewRow = {
  id: string;
  role: string | null;
  company: string | null;
  interview_type: string | null;
  scheduled_at: string;
  status: string;
  reminder_sent_at?: string | null;
  candidate_id: string | null;
  candidates?: {
    id: string;
    name: string | null;
    email: string | null;
    user_id: string | null;
  } | null;
};

export type ReminderSendResult = {
  interviewId: string;
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  emailOk?: boolean;
  notified?: boolean;
};

function siteBase(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-IN', {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso;
  }
}

function isMissingReminderColumn(err: { message?: string; code?: string } | null): boolean {
  if (!err) return false;
  const msg = err.message || '';
  return /reminder_sent_at/i.test(msg) || err.code === '42703' || err.code === 'PGRST204';
}

/**
 * Load scheduled interviews whose start is ~22–26h from now and not yet reminded.
 */
export async function fetchDueReminderInterviews(
  supabase: SupabaseClient,
  opts?: { limit?: number; interviewId?: string },
): Promise<{ rows: ReminderInterviewRow[]; missingColumn: boolean; error?: string }> {
  const limit = opts?.limit ?? 50;
  const now = Date.now();
  const windowStart = new Date(now + 22 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(now + 26 * 60 * 60 * 1000).toISOString();

  const selectCols =
    'id, role, company, interview_type, scheduled_at, status, reminder_sent_at, candidate_id, candidates(id, name, email, user_id)';

  if (opts?.interviewId) {
    const { data, error } = await supabase
      .from('interviews')
      .select(selectCols)
      .eq('id', opts.interviewId)
      .maybeSingle();

    if (error && isMissingReminderColumn(error)) {
      const retry = await supabase
        .from('interviews')
        .select(
          'id, role, company, interview_type, scheduled_at, status, candidate_id, candidates(id, name, email, user_id)',
        )
        .eq('id', opts.interviewId)
        .maybeSingle();
      if (retry.error) return { rows: [], missingColumn: true, error: retry.error.message };
      return {
        rows: retry.data ? [retry.data as ReminderInterviewRow] : [],
        missingColumn: true,
      };
    }
    if (error) return { rows: [], missingColumn: false, error: error.message };
    return {
      rows: data ? [data as ReminderInterviewRow] : [],
      missingColumn: false,
    };
  }

  let { data, error } = await supabase
    .from('interviews')
    .select(selectCols)
    .eq('status', 'scheduled')
    .is('reminder_sent_at', null)
    .gte('scheduled_at', windowStart)
    .lte('scheduled_at', windowEnd)
    .order('scheduled_at', { ascending: true })
    .limit(limit);

  if (error && isMissingReminderColumn(error)) {
    const retry = await supabase
      .from('interviews')
      .select(
        'id, role, company, interview_type, scheduled_at, status, candidate_id, candidates(id, name, email, user_id)',
      )
      .eq('status', 'scheduled')
      .gte('scheduled_at', windowStart)
      .lte('scheduled_at', windowEnd)
      .order('scheduled_at', { ascending: true })
      .limit(limit);
    if (retry.error) return { rows: [], missingColumn: true, error: retry.error.message };
    return {
      rows: (retry.data || []) as ReminderInterviewRow[],
      missingColumn: true,
    };
  }

  if (error) return { rows: [], missingColumn: false, error: error.message };
  return { rows: (data || []) as ReminderInterviewRow[], missingColumn: false };
}

/**
 * Send email + in-app notification for one interview; mark reminder_sent_at when possible.
 */
export async function sendInterviewReminderForRow(
  supabase: SupabaseClient,
  interview: ReminderInterviewRow,
  opts?: { force?: boolean; missingColumn?: boolean },
): Promise<ReminderSendResult> {
  const interviewId = interview.id;

  if (!opts?.force) {
    if (interview.status !== 'scheduled') {
      return { interviewId, sent: false, skipped: true, reason: `status=${interview.status}` };
    }
    if (interview.reminder_sent_at) {
      return { interviewId, sent: false, skipped: true, reason: 'already_reminded' };
    }
  }

  const cand = interview.candidates;
  const email = cand?.email?.trim();
  if (!email) {
    return { interviewId, sent: false, skipped: true, reason: 'no_candidate_email' };
  }

  const name = cand?.name?.trim() || 'Candidate';
  const role = interview.role?.trim() || interview.interview_type || 'Interview';
  const company = interview.company?.trim() || 'the company';
  const when = formatWhen(interview.scheduled_at);
  const invitationsUrl = `${siteBase()}/invitations`;
  const subject = `Reminder: ${role} interview tomorrow`;
  const textBody = [
    `Hi ${name},`,
    '',
    `This is a reminder that your ${role} interview with ${company} is scheduled for:`,
    when,
    '',
    `Open your invitations to confirm details or join when ready:`,
    invitationsUrl,
    '',
    '— AI Smart Interviewer',
  ].join('\n');

  const emailResult = await sendTransactionalEmail(email, subject, textBody);
  if (!emailResult.ok) {
    return {
      interviewId,
      sent: false,
      emailOk: false,
      reason: emailResult.error || 'email_failed',
    };
  }

  let notified = false;
  if (cand?.user_id) {
    const { error: notifErr } = await supabase.from('notifications').insert({
      user_id: cand.user_id,
      type: 'interview_reminder',
      title: subject.slice(0, 120),
      message: `Your ${role} interview is tomorrow (${when}).`,
      is_read: false,
      action_url: '/invitations',
      metadata: {
        interview_id: interviewId,
        candidate_id: cand.id,
        source: 'interview_reminder_24h',
      },
    });
    if (notifErr) {
      // Enum may not include interview_reminder yet — fall back
      if (/interview_reminder|invalid input value/i.test(notifErr.message)) {
        const { error: fallbackErr } = await supabase.from('notifications').insert({
          user_id: cand.user_id,
          type: 'interview_scheduled',
          title: subject.slice(0, 120),
          message: `Your ${role} interview is tomorrow (${when}).`,
          is_read: false,
          action_url: '/invitations',
          metadata: {
            interview_id: interviewId,
            candidate_id: cand.id,
            source: 'interview_reminder_24h',
          },
        });
        notified = !fallbackErr;
      }
    } else {
      notified = true;
    }
  }

  if (!opts?.missingColumn) {
    const markQuery = supabase
      .from('interviews')
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq('id', interviewId);
    const { error: markErr } = opts?.force
      ? await markQuery
      : await markQuery.is('reminder_sent_at', null);

    if (markErr && !isMissingReminderColumn(markErr)) {
      console.warn('[reminders] mark reminder_sent_at failed:', markErr.message);
    }
  }

  return { interviewId, sent: true, emailOk: true, notified };
}

export async function processDueInterviewReminders(
  supabase: SupabaseClient,
  opts?: { limit?: number; forceInterviewId?: string },
): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  missingColumn: boolean;
  results: ReminderSendResult[];
  error?: string;
}> {
  const { rows, missingColumn, error } = await fetchDueReminderInterviews(supabase, {
    limit: opts?.limit,
    interviewId: opts?.forceInterviewId,
  });

  if (error) {
    return {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      missingColumn,
      results: [],
      error,
    };
  }

  const results: ReminderSendResult[] = [];
  for (const row of rows) {
    const result = await sendInterviewReminderForRow(supabase, row, {
      force: Boolean(opts?.forceInterviewId),
      missingColumn,
    });
    results.push(result);
  }

  return {
    processed: results.length,
    sent: results.filter((r) => r.sent).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.sent && !r.skipped).length,
    missingColumn,
    results,
  };
}

/** Auth for cron / internal schedulers */
export function assertCronAuth(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;

  const headerSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('x-internal-secret') ||
    '';
  if (headerSecret && headerSecret === secret) return true;

  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ') && auth.slice(7).trim() === secret) {
    return true;
  }
  return false;
}
