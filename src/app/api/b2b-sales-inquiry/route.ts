import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidEmail } from '@/lib/security/sanitize';
import { secureJson, badRequestResponse } from '@/lib/security/apiHelpers';
import { sendTransactionalEmail } from '@/lib/email/sendTransactional';

/**
 * POST /api/b2b-sales-inquiry
 * Public sales contact from /b2b-pricing.
 * Body: { name, company, email, seats?, message?, plan? }
 */
export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const name = sanitizeString(String(body.name ?? '')).slice(0, 120);
    const company = sanitizeString(String(body.company ?? '')).slice(0, 200);
    const email = sanitizeString(String(body.email ?? '')).toLowerCase().slice(0, 254);
    const seats = sanitizeString(String(body.seats ?? '')).slice(0, 20);
    const message = sanitizeString(String(body.message ?? '')).slice(0, 2000);
    const plan = sanitizeString(String(body.plan ?? '')).slice(0, 80);

    if (!name) return badRequestResponse('name is required');
    if (!company) return badRequestResponse('company is required');
    if (!isValidEmail(email)) return badRequestResponse('Valid email is required');

    const salesTo =
      process.env.B2B_SALES_EMAIL ||
      process.env.SALES_EMAIL ||
      process.env.BREVO_SENDER_EMAIL ||
      'noreply@triveda.ai';

    const subject = `B2B sales inquiry${plan ? ` — ${plan}` : ''} from ${company}`;
    const textBody = [
      'New B2B pricing inquiry',
      '',
      `Name: ${name}`,
      `Company: ${company}`,
      `Email: ${email}`,
      seats ? `Seats interest: ${seats}` : null,
      plan ? `Plan: ${plan}` : null,
      '',
      'Message:',
      message || '(none)',
    ]
      .filter((l) => l !== null)
      .join('\n');

    const sent = await sendTransactionalEmail(salesTo, subject, textBody);

    // Best-effort: notify first admin so inquiry is visible in-app
    try {
      const supabase = await createClient();
      const { data: admins } = await supabase
        .from('user_profiles')
        .select('id')
        .in('role', ['admin', 'super_admin'])
        .limit(3);
      if (admins?.length) {
        await supabase.from('notifications').insert(
          admins.map((a) => ({
            user_id: a.id,
            type: 'system',
            title: 'B2B sales inquiry',
            message: `${name} at ${company} (${email})${plan ? ` · ${plan}` : ''}`,
            action_url: '/b2b-pricing#contact',
            is_read: false,
          })),
        );
      }
    } catch {
      // non-fatal
    }

    if (!sent.ok) {
      // Still acknowledge if we at least stored notifications; otherwise surface error
      return secureJson(
        {
          error: sent.error || 'Failed to send inquiry email',
          data: { queued: false },
        },
        502,
      );
    }

    return secureJson({ data: { ok: true } }, 201);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return secureJson({ error: msg }, 500);
  }
}
