-- Refresh inbox_messages view to include interview_reminder category mapping.
-- Enum value interview_reminder is added in 20260923140000_interview_reminder_sent.sql
-- (ADD VALUE IF NOT EXISTS is idempotent if this runs first).

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'interview_reminder';

CREATE OR REPLACE VIEW public.inbox_messages AS
SELECT
  id,
  user_id,
  CASE
    WHEN type::text IN (
      'interview_scheduled',
      'interview_reminder',
      'booking_confirmed',
      'interview_completed'
    ) THEN 'interview_reminder'
    WHEN type::text IN ('score_ready', 'assessment_assigned') THEN 'score_notification'
    WHEN type::text IN (
      'shortlisted',
      'offer_accepted',
      'offer_received',
      'offer_declined',
      'task_due'
    ) THEN 'feedback_decision'
    WHEN type::text = 'seat_purchase' THEN 'seat_purchase'
    ELSE 'system'
  END AS category,
  type,
  title,
  message,
  is_read,
  action_url,
  metadata,
  created_at
FROM public.notifications;

GRANT SELECT ON public.inbox_messages TO authenticated;
