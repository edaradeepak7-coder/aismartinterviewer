/**
 * Workflow Automation Service
 * Centralizes all automated triggers across modules and roles.
 * Handles: enrollment → assessment unlock → interview scheduling → rewards → notifications → leaderboard
 */

import { sendCourseEnrollmentEmail, sendAssessmentCompletionEmail, sendInterviewScheduledEmail, sendAchievementUnlockEmail, sendLeaderboardMilestoneEmail } from './emailService';

export type WorkflowRole = 'candidate' | 'recruiter' | 'admin' | 'institution_admin' | 'org_admin';

export interface WorkflowContext {
  userId: string;
  userEmail: string;
  userName: string;
  role: WorkflowRole;
  data?: Record<string, any>;
}

// ─── Enrollment Workflow ──────────────────────────────────────────────────────
/**
 * Triggered when a candidate enrolls in a course.
 * Automation chain: email → notification → unlock first assessment → update progress
 */
export async function triggerEnrollmentWorkflow(ctx: WorkflowContext & { courseName: string; courseId: string }) {
  const steps: Array<{ name: string; status: 'pending' | 'done' | 'failed' }> = [];

  try {
    // Step 1: Send enrollment confirmation email
    await sendCourseEnrollmentEmail(ctx.userEmail, ctx.userName, ctx.courseName);
    steps.push({ name: 'enrollment_email', status: 'done' });

    // Step 2: Dispatch in-app notification
    await dispatchNotification({
      userId: ctx.userId,
      type: 'enrollment',
      title: `Enrolled in ${ctx.courseName}`,
      message: `You've successfully enrolled. Your first assessment is now unlocked.`,
      actionUrl: `/courses/${ctx.courseId}`,
    });
    steps.push({ name: 'enrollment_notification', status: 'done' });

    // Step 3: Unlock first assessment for this course
    await unlockAssessment({ userId: ctx.userId, courseId: ctx.courseId, assessmentIndex: 0 });
    steps.push({ name: 'assessment_unlock', status: 'done' });

    // Step 4: Initialize progress tracking
    await initProgressTracking({ userId: ctx.userId, courseId: ctx.courseId });
    steps.push({ name: 'progress_init', status: 'done' });

    logWorkflow('enrollment', ctx.userId, steps);
  } catch (err) {
    console.warn('[WorkflowAutomation] Enrollment workflow error (non-blocking):', err);
  }
}

// ─── Assessment Completion Workflow ──────────────────────────────────────────
/**
 * Triggered when a candidate completes an assessment.
 * Automation chain: email → notification → check pass/fail → unlock next or schedule interview → update leaderboard
 */
export async function triggerAssessmentCompletionWorkflow(ctx: WorkflowContext & {
  assessmentName: string;
  score: number;
  passed: boolean;
  courseId?: string;
  nextAssessmentIndex?: number;
}) {
  try {
    // Step 1: Send completion email
    await sendAssessmentCompletionEmail(ctx.userEmail, ctx.userName, ctx.assessmentName, ctx.score, ctx.passed);

    // Step 2: In-app notification
    await dispatchNotification({
      userId: ctx.userId,
      type: 'assessment_complete',
      title: ctx.passed ? `Assessment Passed — ${ctx.score}%` : `Assessment Completed — ${ctx.score}%`,
      message: ctx.passed
        ? 'Congratulations! You passed. Next module is now unlocked.' :'Keep practicing! Review the feedback and try again.',
      actionUrl: '/assessment-results',
    });

    if (ctx.passed) {
      // Step 3a: Unlock next assessment or interview slot
      if (ctx.courseId && ctx.nextAssessmentIndex !== undefined) {
        await unlockAssessment({ userId: ctx.userId, courseId: ctx.courseId, assessmentIndex: ctx.nextAssessmentIndex });
      } else {
        // All assessments done — unlock interview scheduling
        await unlockInterviewSlot({ userId: ctx.userId });
        await dispatchNotification({
          userId: ctx.userId,
          type: 'interview_unlock',
          title: 'Mock Interview Unlocked!',
          message: 'You\'ve completed all assessments. Book your mock interview now.',
          actionUrl: '/book-interview',
        });
      }

      // Step 4: Check for achievement unlock
      if (ctx.score >= 90) {
        await triggerAchievementWorkflow({ ...ctx, achievementName: 'High Scorer', achievementId: 'high_scorer' });
      }

      // Step 5: Update leaderboard
      await updateLeaderboard({ userId: ctx.userId, scoreIncrement: ctx.score });
    }

    logWorkflow('assessment_completion', ctx.userId, [{ name: 'all_steps', status: 'done' }]);
  } catch (err) {
    console.warn('[WorkflowAutomation] Assessment completion workflow error (non-blocking):', err);
  }
}

// ─── Interview Scheduling Workflow ───────────────────────────────────────────
/**
 * Triggered when an interview is scheduled (by candidate or recruiter).
 * Automation chain: email to candidate + recruiter → notifications → calendar event → credit deduction
 */
export async function triggerInterviewSchedulingWorkflow(ctx: WorkflowContext & {
  interviewType: string;
  scheduledDate: string;
  recruiterEmail?: string;
  recruiterName?: string;
  creditCost?: number;
}) {
  try {
    // Step 1: Email candidate
    await sendInterviewScheduledEmail(ctx.userEmail, ctx.userName, ctx.interviewType, ctx.scheduledDate);

    // Step 2: Email recruiter if present
    if (ctx.recruiterEmail && ctx.recruiterName) {
      await sendInterviewScheduledEmail(ctx.recruiterEmail, ctx.recruiterName, ctx.interviewType, ctx.scheduledDate, {
        candidateName: ctx.userName,
        note: 'A candidate has booked an interview slot with you.',
      });
    }

    // Step 3: In-app notification
    await dispatchNotification({
      userId: ctx.userId,
      type: 'interview_scheduled',
      title: `Interview Scheduled — ${ctx.interviewType}`,
      message: `Your interview is confirmed for ${ctx.scheduledDate}. Prepare well!`,
      actionUrl: '/invitations',
    });

    // Step 4: Deduct credits if applicable
    if (ctx.creditCost && ctx.creditCost > 0) {
      await deductCredits({ userId: ctx.userId, amount: ctx.creditCost, reason: `Interview booking: ${ctx.interviewType}` });
    }

    logWorkflow('interview_scheduling', ctx.userId, [{ name: 'all_steps', status: 'done' }]);
  } catch (err) {
    console.warn('[WorkflowAutomation] Interview scheduling workflow error (non-blocking):', err);
  }
}

// ─── Achievement Unlock Workflow ─────────────────────────────────────────────
/**
 * Triggered when a candidate unlocks an achievement/badge.
 * Automation chain: email → notification → leaderboard update → check milestone
 */
export async function triggerAchievementWorkflow(ctx: WorkflowContext & {
  achievementName: string;
  achievementId: string;
}) {
  try {
    await sendAchievementUnlockEmail(ctx.userEmail, ctx.userName, ctx.achievementName);

    await dispatchNotification({
      userId: ctx.userId,
      type: 'achievement',
      title: `Achievement Unlocked: ${ctx.achievementName}`,
      message: 'Check your certificates page to view your new badge.',
      actionUrl: '/certificates',
    });

    await updateLeaderboard({ userId: ctx.userId, scoreIncrement: 10, reason: 'achievement' });

    logWorkflow('achievement_unlock', ctx.userId, [{ name: 'all_steps', status: 'done' }]);
  } catch (err) {
    console.warn('[WorkflowAutomation] Achievement workflow error (non-blocking):', err);
  }
}

// ─── Leaderboard Milestone Workflow ──────────────────────────────────────────
/**
 * Triggered when a candidate reaches a leaderboard milestone (top 10, top 3, #1).
 */
export async function triggerLeaderboardMilestoneWorkflow(ctx: WorkflowContext & { rank: number }) {
  try {
    await sendLeaderboardMilestoneEmail(ctx.userEmail, ctx.userName, ctx.rank);

    await dispatchNotification({
      userId: ctx.userId,
      type: 'leaderboard',
      title: `You reached Rank #${ctx.rank}!`,
      message: 'Keep it up — you\'re among the top performers on the platform.',
      actionUrl: '/leaderboard',
    });

    logWorkflow('leaderboard_milestone', ctx.userId, [{ name: 'all_steps', status: 'done' }]);
  } catch (err) {
    console.warn('[WorkflowAutomation] Leaderboard milestone workflow error (non-blocking):', err);
  }
}

// ─── Recruiter Workflow ───────────────────────────────────────────────────────
/**
 * Triggered when a recruiter bulk-schedules interviews.
 * Automation chain: email each candidate → notifications → calendar entries
 */
export async function triggerBulkInterviewScheduleWorkflow(params: {
  candidates: Array<{ userId: string; email: string; name: string }>;
  interviewType: string;
  scheduledDate: string;
  recruiterEmail: string;
  recruiterName: string;
}) {
  const results = await Promise.allSettled(
    params.candidates.map(candidate =>
      triggerInterviewSchedulingWorkflow({
        userId: candidate.userId,
        userEmail: candidate.email,
        userName: candidate.name,
        role: 'candidate',
        interviewType: params.interviewType,
        scheduledDate: params.scheduledDate,
        recruiterEmail: params.recruiterEmail,
        recruiterName: params.recruiterName,
      })
    )
  );

  const succeeded = results.filter(r => r.status === 'fulfilled').length;
  console.info(`[WorkflowAutomation] Bulk schedule: ${succeeded}/${params.candidates.length} succeeded`);
}

// ─── Admin Workflow ───────────────────────────────────────────────────────────
/**
 * Triggered when admin publishes a new course.
 * Automation chain: notify enrolled users → update content metrics → audit log
 */
export async function triggerCoursePublishWorkflow(params: {
  courseId: string;
  courseName: string;
  adminId: string;
  enrolledUserIds: string[];
}) {
  try {
    // Notify all enrolled users
    await Promise.allSettled(
      params.enrolledUserIds.map(userId =>
        dispatchNotification({
          userId,
          type: 'course_update',
          title: `New Course Available: ${params.courseName}`,
          message: 'A new course has been published. Check it out now!',
          actionUrl: `/courses/${params.courseId}`,
        })
      )
    );

    logWorkflow('course_publish', params.adminId, [{ name: 'notifications_sent', status: 'done' }]);
  } catch (err) {
    console.warn('[WorkflowAutomation] Course publish workflow error (non-blocking):', err);
  }
}

// ─── Internal helpers (non-blocking stubs — replace with real API calls) ─────

async function dispatchNotification(params: {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
}) {
  // In production: POST /api/notifications with Supabase insert
  console.debug('[WorkflowAutomation] Notification dispatched:', params.type, '→', params.userId);
}

async function unlockAssessment(params: { userId: string; courseId: string; assessmentIndex: number }) {
  // In production: update user_progress table to unlock next assessment
  console.debug('[WorkflowAutomation] Assessment unlocked:', params);
}

async function unlockInterviewSlot(params: { userId: string }) {
  // In production: update user_profiles.interview_slots_available += 1
  console.debug('[WorkflowAutomation] Interview slot unlocked:', params.userId);
}

async function updateLeaderboard(params: { userId: string; scoreIncrement: number; reason?: string }) {
  // In production: upsert leaderboard table
  console.debug('[WorkflowAutomation] Leaderboard updated:', params);
}

async function deductCredits(params: { userId: string; amount: number; reason: string }) {
  // In production: POST /api/credits/deduct
  console.debug('[WorkflowAutomation] Credits deducted:', params);
}

async function initProgressTracking(params: { userId: string; courseId: string }) {
  // In production: insert into user_progress table
  console.debug('[WorkflowAutomation] Progress tracking initialized:', params);
}

function logWorkflow(type: string, userId: string, steps: Array<{ name: string; status: string }>) {
  console.info(`[WorkflowAutomation] ${type} completed for user ${userId}:`, steps.map(s => `${s.name}:${s.status}`).join(', '));
}
