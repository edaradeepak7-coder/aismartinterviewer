/**
 * Shared transactional email send (Brevo → Resend fallback).
 * Used by candidate-decision and bulk email APIs.
 */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  textBody: string,
): Promise<{ ok: boolean; error?: string }> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const html = `<div style="font-family:sans-serif;line-height:1.55;white-space:pre-wrap">${textBody
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')}</div>`;

  if (brevoKey && !brevoKey.startsWith('your-')) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          sender: {
            name: 'AI Smart Interviewer',
            email: process.env.BREVO_SENDER_EMAIL || 'noreply@triveda.ai',
          },
          to: [{ email: to }],
          subject,
          textContent: textBody,
          htmlContent: html,
        }),
      });
      if (res.ok) return { ok: true };
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Brevo ${res.status}: ${errText.slice(0, 200)}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Brevo send failed';
      return { ok: false, error: message };
    }
  }

  if (resendKey && !resendKey.startsWith('your-')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'AI Smart Interviewer <onboarding@resend.dev>',
          to: [to],
          subject,
          text: textBody,
          html,
        }),
      });
      if (res.ok) return { ok: true };
      const errText = await res.text().catch(() => '');
      return { ok: false, error: `Resend ${res.status}: ${errText.slice(0, 200)}` };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Resend send failed';
      return { ok: false, error: message };
    }
  }

  return { ok: false, error: 'No email provider configured (BREVO_API_KEY or RESEND_API_KEY)' };
}

export function applyEmailMerge(
  template: string,
  vars: { name?: string | null; email?: string | null },
): string {
  return template
    .replace(/\{\{\s*name\s*\}\}/gi, vars.name?.trim() || 'Candidate')
    .replace(/\{\{\s*email\s*\}\}/gi, vars.email?.trim() || '');
}
