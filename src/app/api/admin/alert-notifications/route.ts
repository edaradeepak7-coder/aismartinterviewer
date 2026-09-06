/**
 * POST /api/admin/alert-notifications
 * Sends alert notifications via Slack webhook and/or email (Brevo/Resend)
 * when a real-time monitor threshold is breached.
 */
import { NextRequest, NextResponse } from 'next/server';

export interface AlertPayload {
  metric: string;
  metricLabel: string;
  currentValue: number;
  threshold: number;
  severity: 'warn' | 'critical';
  unit: string;
  slackWebhookUrl?: string;
  emailRecipients?: string[];
  slackEnabled: boolean;
  emailEnabled: boolean;
}

async function sendSlackNotification(webhookUrl: string, payload: AlertPayload): Promise<boolean> {
  const color = payload.severity === 'critical' ? '#ef4444' : '#f59e0b';
  const emoji = payload.severity === 'critical' ? '🚨' : '⚠️';

  const body = {
    attachments: [
      {
        color,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: `${emoji} ${payload.severity === 'critical' ? 'CRITICAL' : 'WARNING'}: ${payload.metricLabel}`,
            },
          },
          {
            type: 'section',
            fields: [
              { type: 'mrkdwn', text: `*Metric:*\n${payload.metricLabel}` },
              { type: 'mrkdwn', text: `*Severity:*\n${payload.severity.toUpperCase()}` },
              { type: 'mrkdwn', text: `*Current Value:*\n${payload.currentValue}${payload.unit}` },
              { type: 'mrkdwn', text: `*Threshold:*\n${payload.threshold}${payload.unit}` },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: `Triggered at ${new Date().toISOString()} | AI Smart Interviewer Real-Time Monitor`,
              },
            ],
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function sendEmailNotification(recipients: string[], payload: AlertPayload): Promise<boolean> {
  const brevoKey = process.env.BREVO_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  const subject = `[${payload.severity.toUpperCase()}] ${payload.metricLabel} threshold breached`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: ${payload.severity === 'critical' ? '#ef4444' : '#f59e0b'}; color: white; padding: 16px 24px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">${payload.severity === 'critical' ? '🚨 CRITICAL ALERT' : '⚠️ WARNING ALERT'}</h2>
      </div>
      <div style="background: #1a1a2e; color: #e2e8f0; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #2d3748;">
        <h3 style="color: #a78bfa; margin-top: 0;">${payload.metricLabel}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 8px 0; color: #94a3b8;">Current Value</td><td style="padding: 8px 0; font-weight: bold; color: ${payload.severity === 'critical' ? '#f87171' : '#fbbf24'};">${payload.currentValue}${payload.unit}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Threshold</td><td style="padding: 8px 0;">${payload.threshold}${payload.unit}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Severity</td><td style="padding: 8px 0;">${payload.severity.toUpperCase()}</td></tr>
          <tr><td style="padding: 8px 0; color: #94a3b8;">Triggered At</td><td style="padding: 8px 0;">${new Date().toLocaleString()}</td></tr>
        </table>
        <p style="color: #64748b; font-size: 12px; margin-top: 24px;">AI Smart Interviewer — Real-Time Infrastructure Monitor</p>
      </div>
    </div>
  `;

  // Try Brevo first
  if (brevoKey && !brevoKey.startsWith('your-')) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'AI Smart Interviewer Alerts', email: 'alerts@noreply.aismartinterviewer.com' },
          to: recipients.map(email => ({ email })),
          subject,
          htmlContent: htmlBody,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return true;
    } catch { /* fall through to Resend */ }
  }

  // Fallback to Resend
  if (resendKey && !resendKey.startsWith('your-')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'AI Smart Interviewer Alerts <alerts@resend.dev>',
          to: recipients,
          subject,
          html: htmlBody,
        }),
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) return true;
    } catch { /* failed */ }
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const payload: AlertPayload = await req.json();

    const results: { slack?: boolean; email?: boolean } = {};

    await Promise.all([
      payload.slackEnabled && payload.slackWebhookUrl
        ? sendSlackNotification(payload.slackWebhookUrl, payload).then(ok => { results.slack = ok; })
        : Promise.resolve(),
      payload.emailEnabled && payload.emailRecipients?.length
        ? sendEmailNotification(payload.emailRecipients, payload).then(ok => { results.email = ok; })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ success: true, results });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
