import { createClient } from '@/lib/supabase/client';

export type EmailType =
  | 'course_enrollment' |'assessment_completion' |'interview_scheduled' |'interview_reminder_24h' |'score_notification' |'seat_purchase_confirmation' |'auto_renewal_reminder' |'achievement_unlock' |'leaderboard_milestone';

interface EmailPayload {
  type: EmailType;
  to: string;
  data: Record<string, any>;
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

// ─── Convenience helpers ──────────────────────────────────────────────────────

export function sendCourseEnrollmentEmail(to: string, userName: string, courseName: string, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'course_enrollment',
    to,
    data: { userName, courseName, enrolledDate: new Date().toLocaleDateString(), ...extras },
  });
}

export function sendAssessmentCompletionEmail(to: string, userName: string, assessmentName: string, score: number, passed: boolean, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'assessment_completion',
    to,
    data: { userName, assessmentName, score, passed, ...extras },
  });
}

export function sendInterviewScheduledEmail(to: string, userName: string, interviewType: string, scheduledDate: string, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'interview_scheduled',
    to,
    data: { userName, interviewType, scheduledDate, ...extras },
  });
}

/** Send 24-hour interview reminder */
export function sendInterviewReminderEmail(to: string, userName: string, interviewType: string, scheduledDate: string, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'interview_reminder_24h',
    to,
    data: { userName, interviewType, scheduledDate, ...extras },
  });
}

/** Send score notification after interview completion */
export function sendScoreNotificationEmail(to: string, userName: string, score: number, interviewType?: string, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'score_notification',
    to,
    data: { userName, score, interviewType: interviewType || 'Interview', ...extras },
  });
}

/** Send seat purchase confirmation to institution admin */
export function sendSeatPurchaseConfirmationEmail(to: string, userName: string, seats: number, amount: number, paymentMethod: 'online' | 'offline', extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'seat_purchase_confirmation',
    to,
    data: { userName, seats, amount, paymentMethod, ...extras },
  });
}

/** Send auto-renewal reminder to institution admin */
export function sendAutoRenewalReminderEmail(to: string, userName: string, seats: number, renewalAmount: number, renewalDate: string, daysUntilRenewal: number, extras?: Record<string, any>) {
  return sendPlatformEmail({
    type: 'auto_renewal_reminder',
    to,
    data: { userName, seats, renewalAmount, renewalDate, daysUntilRenewal, ...extras },
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
