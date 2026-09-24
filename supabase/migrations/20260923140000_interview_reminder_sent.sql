-- 24h interview reminder tracking

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.interviews.reminder_sent_at IS
  'When the ~24h pre-interview reminder email/notification was sent (null = not yet).';

CREATE INDEX IF NOT EXISTS idx_interviews_reminder_due
  ON public.interviews (scheduled_at)
  WHERE reminder_sent_at IS NULL AND status = 'scheduled';

-- Optional inbox category for reminders
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'interview_reminder';
