-- Index + allow recruiters to read proctoring by interview; optional anon session insert for public join

CREATE INDEX IF NOT EXISTS idx_proctoring_events_interview
  ON public.proctoring_events(interview_id)
  WHERE interview_id IS NOT NULL;

-- Recruiters/admins can read all proctoring rows (dashboard risk column)
DROP POLICY IF EXISTS "proctoring_events_recruiter_read_all" ON public.proctoring_events;
CREATE POLICY "proctoring_events_recruiter_read_all"
  ON public.proctoring_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role IN ('recruiter', 'admin', 'super_admin', 'evaluator', 'institution_admin', 'org_admin')
    )
  );
