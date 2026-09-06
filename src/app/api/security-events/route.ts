import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, serverErrorResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { sendSecurityAlert, getAdminEmails, type SecurityEventType } from '@/lib/security/securityAlerts';
import { writeAuditLogServer } from '@/lib/security/auditLog';

const VALID_EVENT_TYPES: SecurityEventType[] = [
  'failed_login',
  'session_revoked',
  'unusual_ip',
  'role_change',
  'suspicious_activity',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { eventType, userEmail, userId, details, targetRole } = body;

    if (!eventType || !VALID_EVENT_TYPES.includes(eventType)) {
      return badRequestResponse('Invalid or missing eventType');
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // Get admin emails to notify
    const adminEmails = await getAdminEmails();

    // Send email alert
    await sendSecurityAlert({
      eventType,
      userId,
      userEmail,
      ipAddress: ip,
      details,
      targetRole,
      adminEmails,
      timestamp: new Date().toISOString(),
    });

    // Write audit log
    const supabase = await createClient();
    await writeAuditLogServer(
      {
        user_email: userEmail,
        action: 'suspicious_activity',
        outcome: 'blocked',
        ip_address: ip,
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        details: { eventType, details, targetRole },
      },
      supabase
    );

    return secureJson({ success: true });
  } catch {
    return serverErrorResponse();
  }
}
