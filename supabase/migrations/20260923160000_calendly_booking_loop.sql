-- Per-recruiter Calendly config + interview event URI tracking

CREATE TABLE IF NOT EXISTS public.recruiter_calendly_settings (
  recruiter_id UUID PRIMARY KEY REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  scheduling_url TEXT NOT NULL,
  user_uri TEXT,
  default_event_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE public.recruiter_calendly_settings IS
  'Recruiter Calendly scheduling URL and optional API user URI (token stays server-side in env).';

ALTER TABLE public.recruiter_calendly_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recruiters_manage_own_calendly_settings" ON public.recruiter_calendly_settings;
CREATE POLICY "recruiters_manage_own_calendly_settings"
  ON public.recruiter_calendly_settings
  FOR ALL
  TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS calendly_event_uri TEXT,
  ADD COLUMN IF NOT EXISTS calendly_invitee_uri TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_interviews_calendly_invitee_uri
  ON public.interviews (calendly_invitee_uri)
  WHERE calendly_invitee_uri IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_calendly_event_uri
  ON public.interviews (calendly_event_uri)
  WHERE calendly_event_uri IS NOT NULL;

COMMENT ON COLUMN public.interviews.calendly_event_uri IS
  'Calendly scheduled_events URI when booked via Calendly.';
COMMENT ON COLUMN public.interviews.calendly_invitee_uri IS
  'Calendly invitee URI for idempotent webhook upserts.';
