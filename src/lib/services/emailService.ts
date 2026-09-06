import { createClient } from '@/lib/supabase/client';

export type EmailType =
  | 'course_enrollment' |'assessment_completion' |'interview_scheduled' |'interview_reminder_24h' |'score_notification' |'seat_purchase_confirmation' |'auto_renewal_reminder' |'achievement_unlock' |'leaderboard_milestone' |'subscription_activated' |'subscription_renewed' |'subscription_cancelled' |'overage_threshold_80' |'overage_threshold_90' |'payment_failed_retry' |'payment_retry_success';

interface EmailPayload {
  type: EmailType;
  to: string;
  data: Record<string, unknown>;
}

/**
 * Send a platform email via the Supabase Edge Function.
 * Falls back silently if the function is not deployed.
 */
export async function sendPlatformEmail(payload: EmailPayload): Promise<void> {
  try {
    const supabase = createClient();
    const { error } = await supabase.functions.invoke('send-platform-email', {
      body: payload,
    });
    if (error) {
      console.warn('[EmailService] Failed to send email:', error.message);
    }
  } catch (err) {
    console.warn('[EmailService] Email send error (non-blocking):', err);
  }
}

// ─── Existing helpers ─────────────────────────────────────────────────────────

export function sendCourseEnrollmentEmail(to: string, userName: string, courseName: string, extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'course_enrollment',
    to,
    data: { userName, courseName, enrolledDate: new Date().toLocaleDateString(), ...extras },
  });
}

export function sendAssessmentCompletionEmail(to: string, userName: string, assessmentName: string, score: number, passed: boolean, extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'assessment_completion',
    to,
    data: { userName, assessmentName, score, passed, ...extras },
  });
}

export function sendInterviewScheduledEmail(to: string, userName: string, interviewType: string, scheduledDate: string, extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'interview_scheduled',
    to,
    data: { userName, interviewType, scheduledDate, ...extras },
  });
}

export function sendInterviewReminderEmail(to: string, userName: string, interviewType: string, scheduledDate: string, extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'interview_reminder_24h',
    to,
    data: { userName, interviewType, scheduledDate, ...extras },
  });
}

export function sendScoreNotificationEmail(to: string, userName: string, score: number, interviewType?: string, extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'score_notification',
    to,
    data: { userName, score, interviewType: interviewType || 'Interview', ...extras },
  });
}

export function sendSeatPurchaseConfirmationEmail(to: string, userName: string, seats: number, amount: number, paymentMethod: 'online' | 'offline', extras?: Record<string, unknown>) {
  return sendPlatformEmail({
    type: 'seat_purchase_confirmation',
    to,
    data: { userName, seats, amount, paymentMethod, ...extras },
  });
}

// ─── New subscription lifecycle email helpers ─────────────────────────────────

/** Sent when a subscription is successfully activated after payment */
export function sendSubscriptionActivatedEmail(to: string, userName: string, planName: string, renewalDate: string, creditsTotal: number) {
  return sendPlatformEmail({
    type: 'subscription_activated',
    to,
    data: { userName, planName, renewalDate, creditsTotal },
  });
}

/** Sent when a subscription auto-renews successfully */
export function sendSubscriptionRenewedEmail(to: string, userName: string, planName: string, nextRenewalDate: string, creditsReset: number) {
  return sendPlatformEmail({
    type: 'subscription_renewed',
    to,
    data: { userName, planName, nextRenewalDate, creditsReset },
  });
}

/** Sent when subscription is cancelled */
export function sendSubscriptionCancelledEmail(to: string, userName: string, planName: string, dataRetainUntil: string) {
  return sendPlatformEmail({
    type: 'subscription_cancelled',
    to,
    data: { userName, planName, dataRetainUntil, message: 'Your data will be retained for 30 days.' },
  });
}

/** Sent when credit usage reaches 80% of plan limit */
export function sendOverageThreshold80Email(to: string, userName: string, creditsUsed: number, creditsTotal: number, planName: string) {
  return sendPlatformEmail({
    type: 'overage_threshold_80',
    to,
    data: { userName, creditsUsed, creditsTotal, planName, percentUsed: 80, remaining: creditsTotal - creditsUsed },
  });
}

/** Sent when credit usage reaches 90% of plan limit */
export function sendOverageThreshold90Email(to: string, userName: string, creditsUsed: number, creditsTotal: number, planName: string) {
  return sendPlatformEmail({
    type: 'overage_threshold_90',
    to,
    data: { userName, creditsUsed, creditsTotal, planName, percentUsed: 90, remaining: creditsTotal - creditsUsed },
  });
}

/** Sent when a payment fails and retry is scheduled */
export function sendPaymentFailedRetryEmail(to: string, userName: string, attempt: number, nextRetryDate: string, fallbackMethod?: string) {
  return sendPlatformEmail({
    type: 'payment_failed_retry',
    to,
    data: { userName, attempt, nextRetryDate, fallbackMethod: fallbackMethod || null, maxAttempts: 4 },
  });
}

/** Sent when a payment retry succeeds */
export function sendPaymentRetrySuccessEmail(to: string, userName: string, planName: string) {
  return sendPlatformEmail({
    type: 'payment_retry_success',
    to,
    data: { userName, planName },
  });
}

export function sendAchievementUnlockEmail(to: string, userName: string, achievementName: string, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'achievement_unlock',
    to,
    data: { userName, achievementName, ...extras },
  });
}

export function sendLeaderboardMilestoneEmail(to: string, userName: string, rank: number, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'leaderboard_milestone',
    to,
    data: { userName, rank, ...extras },
  });
}
