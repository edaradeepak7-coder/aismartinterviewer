import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';

/**
 * POST /api/email/candidate-decision
 * Body: { to, subject, body, interviewId?, candidateId? }
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

    const to = sanitizeString(String(body.to ?? ''));
    const subject = sanitizeString(String(body.subject ?? '')).slice(0, 300);
    const textBody = sanitizeString(String(body.body ?? '')).slice(0, 10000);
    const interviewId = body.interviewId ? sanitizeString(String(body.interviewId)) : null;
    const candidateId = body.candidateId ? sanitizeString(String(body.candidateId)) : null;

    if (!to || !subject || !textBody) {
      return badRequestResponse('to, subject, and body are required');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return badRequestResponse('Invalid email address');
    }
    if (interviewId && !isValidUUID(interviewId)) return badRequestResponse('Invalid interviewId');
    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidateId');

    const sent = await sendTransactionalEmail(to, subject, textBody);
    if (!sent.ok) {
      return secureJson({ error: sent.error || 'Email send failed', sent: false }, 502);
    }

    // Best-effort in-app notification if candidate has a linked account
    try {
      if (candidateId) {
        const kind = sanitizeString(String(body.kind ?? ''));
        const isOffer = kind === 'offer';
        const { data: candidate } = await supabase
          .from('candidates')
          .select('user_id')
          .eq('id', candidateId)
          .maybeSingle();
        if (candidate?.user_id) {
          await supabase.from('notifications').insert({
            user_id: candidate.user_id,
            type: isOffer ? 'offer_received' : 'system',
            title: subject.slice(0, 120),
            message: textBody.slice(0, 280),
            is_read: false,
            action_url: isOffer ? '/job-offers' : '/invitations',
            metadata: {
              interview_id: interviewId,
              source: 'structured_feedback_email',
              kind: kind || null,
            },
          });
        }
      }
    } catch {
      // non-blocking
    }

    return secureJson({ sent: true });
  } catch (err) {
    console.error('candidate-decision email error:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
