-- Speed recruiter-scoped analytics range scans
CREATE INDEX IF NOT EXISTS idx_interviews_recruiter_created
  ON public.interviews (recruiter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_job_offers_recruiter_created
  ON public.job_offers (recruiter_id, created_at DESC);
