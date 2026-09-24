import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/security/apiHelpers';
import { generateSmsOtp, verifySmsOtp } from '@/lib/security/mfa';
import { writeAuditLogServer } from '@/lib/security/auditLog';

/**
 * POST /api/mfa/sms-otp
 * Body: { action: 'send' | 'verify', phone?: string, code?: string }
 *
 * 'send'   — generates a 6-digit OTP and (in production) sends it via SMS
 * 'verify' — verifies the submitted code against the stored OTP
 *
 * NOTE: SMS delivery requires an SMS provider (Twilio, MSG91, AWS SNS).
 * Without a configured SMS provider, the OTP is logged server-side only.
 * In development, the code is returned in the response for testing.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { action, phone, code } = body;

    if (!action || !['send', 'verify'].includes(action)) {
      return badRequestResponse('action must be "send" or "verify"');
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const ua = request.headers.get('user-agent') ?? 'unknown';

    if (action === 'send') {
      if (!phone || typeof phone !== 'string') {
        return badRequestResponse('phone is required for send action');
      }
      // Sanitize phone: digits, +, spaces, dashes only
      const sanitizedPhone = phone.replace(/[^0-9+\-\s]/g, '').slice(0, 20);
      if (sanitizedPhone.length < 7) {
        return badRequestResponse('Invalid phone number');
      }

      const { code: otpCode, expiresAt } = generateSmsOtp(user.id, sanitizedPhone);

      // Check if SMS provider is configured
      const hasSmsProvider = !!(
        process.env.TWILIO_ACCOUNT_SID ||
        process.env.MSG91_API_KEY ||
        process.env.AWS_SNS_ACCESS_KEY_ID
      );

      let smsSent = false;
      let smsError: string | undefined;

      if (hasSmsProvider) {
        // Production: integrate with configured SMS provider
        // Example: Twilio, MSG91, AWS SNS
        // This block would call the provider API
        // For now, log that provider integration is pending
        console.info(`[SMS OTP] Provider configured but integration pending. User ${user.email} — code ${otpCode} → ${sanitizedPhone}`);
        smsSent = false;
        smsError = 'SMS provider integration pending. Use dev code for testing.';
      } else {
        // No SMS provider configured — log OTP server-side only
        console.info(`[SMS OTP] No SMS provider configured. User ${user.email} — code ${otpCode} → ${sanitizedPhone} (expires ${new Date(expiresAt).toISOString()})`);
        smsSent = false;
        smsError = 'SMS provider not configured. Contact your administrator to set up SMS delivery.';
      }

      await writeAuditLogServer({
        user_id: user.id,
        user_email: user.email,
        action: 'mfa_enrolled',
        resource: 'sms_otp',
        ip_address: ip,
        user_agent: ua,
        outcome: 'success',
        details: {
          method: 'sms',
          phone: sanitizedPhone.slice(0, -4).replace(/\d/g, '*') + sanitizedPhone.slice(-4),
          sms_sent: smsSent,
        },
      }, supabase);

      const maskedPhone = sanitizedPhone.slice(0, -4).replace(/\d/g, '*') + sanitizedPhone.slice(-4);

      return secureJson({
        success: true,
        message: smsSent
          ? `OTP sent to ${maskedPhone}`
          : `OTP generated for ${maskedPhone}. ${smsError ?? ''}`,
        expiresAt,
        sms_delivered: smsSent,
        // DEV ONLY: remove in production
        _dev_code: process.env.NODE_ENV === 'development' ? otpCode : undefined,
        ...(smsError && !smsSent ? { warning: smsError } : {}),
      });
    }

    // action === 'verify'
    if (!code || typeof code !== 'string' || !/^\d{6}$/.test(code)) {
      return badRequestResponse('code must be a 6-digit string');
    }

    const valid = verifySmsOtp(user.id, code);

    await writeAuditLogServer({
      user_id: user.id,
      user_email: user.email,
      action: valid ? 'mfa_verified' : 'mfa_failed',
      resource: 'sms_otp',
      ip_address: ip,
      user_agent: ua,
      outcome: valid ? 'success' : 'failure',
      details: { method: 'sms' },
    }, supabase);

    if (!valid) {
      return secureJson({ success: false, error: 'Invalid or expired OTP code.' }, 400);
    }

    return secureJson({ success: true, message: 'SMS OTP verified successfully.' });
  } catch {
    return serverErrorResponse();
  }
}
