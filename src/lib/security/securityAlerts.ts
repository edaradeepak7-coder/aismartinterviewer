/**
 * Security alert email service.
 * Sends real-time email notifications to admins on suspicious events via Supabase Edge Function.
 *
 * Events covered:
 * - Multiple failed logins
 * - Session revocation
 * - Unusual IP access
 * - Admin role changes
 */

export type SecurityEventType =
  | 'failed_login' |'session_revoked' |'unusual_ip' |'role_change' |'suspicious_activity';

export interface SecurityAlertPayload {
  eventType: SecurityEventType;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  details?: string;
  targetRole?: string;
  adminEmails?: string[];
  timestamp?: string;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Send a security alert email to admins.
 * Calls the Supabase Edge Function `security-alert-email`.
 */
export async function sendSecurityAlert(payload: SecurityAlertPayload): Promise<void> {
  try {
    const { eventType, userId, userEmail, ipAddress, details, targetRole, adminEmails, timestamp } = payload;

    const eventTitles: Record<SecurityEventType, string> = {
      failed_login: 'Multiple Failed Login Attempts Detected',
      session_revoked: 'Admin Session Revoked',
      unusual_ip: 'Unusual IP Access Detected',
      role_change: 'Admin Role Change Performed',
      suspicious_activity: 'Suspicious Activity Detected',
    };

    const eventColors: Record<SecurityEventType, string> = {
      failed_login: '#dc2626',
      session_revoked: '#d97706',
      unusual_ip: '#7c3aed',
      role_change: '#0891b2',
      suspicious_activity: '#dc2626',
    };

    const ts = timestamp ?? new Date().toISOString();
    const title = eventTitles[eventType];
    const color = eventColors[eventType];

    const html = buildAlertHtml({
      title,
      color,
      eventType,
      userId,
      userEmail,
      ipAddress,
      details,
      targetRole,
      timestamp: ts,
    });

    const recipients = adminEmails && adminEmails.length > 0 ? adminEmails : undefined;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/security-alert-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        to: recipients,
        subject: `[Security Alert] ${title}`,
        html,
        eventType,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[SecurityAlert] Failed to send alert email:', err);
    }
  } catch (err) {
    // Never throw — security alerts must not break the main flow
    console.error('[SecurityAlert] Error sending security alert:', err);
  }
}

function buildAlertHtml(params: {
  title: string;
  color: string;
  eventType: string;
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  details?: string;
  targetRole?: string;
  timestamp: string;
}): string {
  const { title, color, userId, userEmail, ipAddress, details, targetRole, timestamp } = params;

  const rows = [
    ['Event', title],
    ['Timestamp', timestamp],
    userEmail ? ['User Email', userEmail] : null,
    userId ? ['User ID', userId] : null,
    ipAddress ? ['IP Address', ipAddress] : null,
    targetRole ? ['Target Role', targetRole] : null,
    details ? ['Details', details] : null,
  ].filter(Boolean) as [string, string][];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="color:#6b7280;font-size:13px;padding:5px 0;width:35%;vertical-align:top;">${label}</td>
        <td style="color:#111827;font-size:13px;font-weight:500;padding:5px 0;">${value}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="background:${color};padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:600;">⚠️ ${title}</h1>
    </div>
    <div style="padding:32px;">
      <p style="color:#374151;margin:0 0 16px;font-size:15px;">
        A security event has been detected on your AI Interviewer platform that requires your attention.
      </p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
      </div>
      <p style="color:#374151;font-size:14px;margin:0 0 8px;">
        <strong>Recommended Actions:</strong>
      </p>
      <ul style="color:#6b7280;font-size:13px;margin:0;padding-left:20px;">
        <li>Review the audit trail in your admin dashboard</li>
        <li>Verify the user's identity if applicable</li>
        <li>Revoke suspicious sessions if needed</li>
        <li>Update security policies if required</li>
      </ul>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">
        Automated security alert — AI Interviewer Platform. Do not reply.
      </p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Fetch admin emails from Supabase to send alerts to.
 * Returns emails of users with super_admin or institution_admin roles.
 */
export async function getAdminEmails(): Promise<string[]> {
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('email')
      .in('role', ['super_admin', 'institution_admin', 'admin']);
    return (data ?? []).map((u: { email: string }) => u.email).filter(Boolean);
  } catch {
    return [];
  }
}
