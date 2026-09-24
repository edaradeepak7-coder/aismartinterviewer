import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidUUID, sanitizeString } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import {
  fetchDueReminderInterviews,
  sendInterviewReminderForRow,
  assertCronAuth,
} from '@/lib/interviews/sendReminders';

/**
 * POST /api/email/interview-reminder
 * Body: { interviewId: string, force?: boolean }
 *
 * Auth: logged-in recruiter/admin who owns the interview, OR cron secret (force send).
 */
export async function POST(request: NextRequest) {
  try {
    const isCron = assertCronAuth(request);
    const supabase = await createClient();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const interviewId = sanitizeString(String(body.interviewId ?? body.interview_id ?? ''));
    const force = Boolean(body.force);
    if (!interviewId || !isValidUUID(interviewId)) {
      return badRequestResponse('interviewId is required');
    }

    if (!isCron) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return unauthorizedResponse();

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const role = profile?.role || '';
      const isAdmin = ['admin', 'super_admin'].includes(role);
      const isRecruiter = ['recruiter', 'org_admin'].includes(role);
      if (!isAdmin && !isRecruiter) return forbiddenResponse();

      const { data: interview } = await supabase
        .from('interviews')
        .select('id, recruiter_id')
        .eq('id', interviewId)
        .maybeSingle();

      if (!interview) return secureJson({ error: 'Interview not found' }, 404);
      if (!isAdmin && interview.recruiter_id !== user.id) {
        return forbiddenResponse();
      }
    }

    const { rows, missingColumn, error } = await fetchDueReminderInterviews(supabase, {
      interviewId,
    });
    if (error) return secureJson({ error }, 500);
    if (!rows.length) return secureJson({ error: 'Interview not found' }, 404);

    const result = await sendInterviewReminderForRow(supabase, rows[0], {
      force: force || isCron,
      missingColumn,
    });

    if (result.skipped) {
      return secureJson({ sent: false, skipped: true, reason: result.reason, missingColumn });
    }
    if (!result.sent) {
      return secureJson(
        { sent: false, error: result.reason || 'Failed to send reminder', missingColumn },
        502,
      );
    }

    return secureJson({
      sent: true,
      notified: result.notified,
      missingColumn,
      interviewId,
    });
  } catch (err) {
    console.error('interview-reminder error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
