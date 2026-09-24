import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { applyEmailMerge, sendTransactionalEmail } from '@/lib/email/sendTransactional';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CANDIDATES = 50;

/**
 * POST /api/email/bulk
 * Body: { candidate_ids: string[], subject: string, body: string }
 * Sends one email per candidate (supports {{name}} / {{email}} merge tags).
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

    const candidateIdsRaw = Array.isArray(body.candidate_ids) ? body.candidate_ids : [];
    const candidate_ids = candidateIdsRaw
      .map((id) => sanitizeString(String(id ?? '')))
      .filter((id) => isValidUUID(id));

    if (candidate_ids.length === 0) {
      return badRequestResponse('candidate_ids must include at least one valid UUID');
    }
    if (candidate_ids.length > MAX_CANDIDATES) {
      return badRequestResponse(`Maximum ${MAX_CANDIDATES} candidates per bulk email`);
    }

    const subjectTemplate = sanitizeString(String(body.subject ?? '')).slice(0, 300);
    const bodyTemplate = sanitizeString(String(body.body ?? '')).slice(0, 10000);
    if (!subjectTemplate || !bodyTemplate) {
      return badRequestResponse('subject and body are required');
    }

    const { data: candidates, error: candErr } = await supabase
      .from('candidates')
      .select('id, name, email, user_id')
      .in('id', candidate_ids);

    if (candErr) return secureJson({ error: 'Failed to load candidates' }, 500);

    const found = candidates || [];
    const foundIds = new Set(found.map((c) => c.id));
    const missing = candidate_ids.filter((id) => !foundIds.has(id));

    let sent = 0;
    let failed = 0;
    const errors: { candidate_id: string; error: string }[] = [];
    const notifications: {
      user_id: string;
      type: 'system';
      title: string;
      message: string;
      is_read: boolean;
      action_url: string;
      metadata: Record<string, string>;
    }[] = [];

    for (const cand of found) {
      const email = (cand.email || '').trim();
      if (!email || !EMAIL_RE.test(email)) {
        failed += 1;
        errors.push({ candidate_id: cand.id, error: 'Missing or invalid email' });
        continue;
      }

      const subject = applyEmailMerge(subjectTemplate, cand).slice(0, 300);
      const textBody = applyEmailMerge(bodyTemplate, cand).slice(0, 10000);
      const result = await sendTransactionalEmail(email, subject, textBody);

      if (!result.ok) {
        failed += 1;
        errors.push({ candidate_id: cand.id, error: result.error || 'Send failed' });
        continue;
      }

      sent += 1;
      if (cand.user_id) {
        notifications.push({
          user_id: cand.user_id,
          type: 'system',
          title: subject.slice(0, 120),
          message: textBody.slice(0, 280),
          is_read: false,
          action_url: '/invitations',
          metadata: { candidate_id: cand.id, source: 'bulk_email' },
        });
      }
    }

    let notified = 0;
    if (notifications.length) {
      const { data: notifRows, error: notifErr } = await supabase
        .from('notifications')
        .insert(notifications)
        .select('id');
      if (notifErr) {
        console.warn('bulk email notify:', notifErr.message);
      } else {
        notified = notifRows?.length || 0;
      }
    }

    if (sent === 0 && failed > 0) {
      return secureJson(
        {
          error: errors[0]?.error || 'All sends failed',
          sent,
          failed,
          missing,
          errors: errors.slice(0, 10),
        },
        502,
      );
    }

    return secureJson({
      data: {
        sent,
        failed,
        missing,
        notified,
        errors: errors.slice(0, 10),
      },
    });
  } catch (err) {
    console.error('bulk email error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
