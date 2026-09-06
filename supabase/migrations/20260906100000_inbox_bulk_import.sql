-- Migration: Inbox, notifications enhancements, and bulk import logs
-- Timestamp: 20260906100000

-- ─── Add missing notification_type enum values ───────────────────────────────
-- NOTE: ALTER TYPE ADD VALUE cannot be used inside a transaction block (DO $$).
-- Each ADD VALUE must run as a standalone statement so it commits before use.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'assessment_assigned';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'shortlisted';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'task_due';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'seat_purchase';

-- ─── Inbox messages view (maps notifications to inbox format) ─────────────────
-- Cast type::text to avoid "unsafe use of new enum value" error when new enum
-- values are added and referenced in the same migration transaction.
CREATE OR REPLACE VIEW public.inbox_messages AS
SELECT
  id,
  user_id,
  CASE
    WHEN type::text IN ('interview_scheduled', 'booking_confirmed', 'interview_completed') THEN 'interview_reminder'
    WHEN type::text IN ('score_ready', 'assessment_assigned') THEN 'score_notification'
    WHEN type::text IN ('shortlisted', 'offer_accepted', 'offer_received', 'offer_declined', 'task_due') THEN 'feedback_decision'
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

-- Grant access to authenticated users
GRANT SELECT ON public.inbox_messages TO authenticated;

-- ─── Bulk import logs table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_bulk_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID,
  imported_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  success_rows INTEGER NOT NULL DEFAULT 0,
  failed_rows INTEGER NOT NULL DEFAULT 0,
  seat_limit_exceeded BOOLEAN NOT NULL DEFAULT false,
  available_seats_at_import INTEGER,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS for bulk imports
ALTER TABLE public.institution_bulk_imports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'institution_bulk_imports' AND policyname = 'institution_bulk_imports_select'
  ) THEN
    CREATE POLICY institution_bulk_imports_select ON public.institution_bulk_imports
      FOR SELECT TO authenticated
      USING (imported_by = auth.uid());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'institution_bulk_imports' AND policyname = 'institution_bulk_imports_insert'
  ) THEN
    CREATE POLICY institution_bulk_imports_insert ON public.institution_bulk_imports
      FOR INSERT TO authenticated
      WITH CHECK (imported_by = auth.uid());
  END IF;
END $$;

-- ─── Index for notifications realtime performance ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type
  ON public.notifications(user_id, type, created_at DESC);
