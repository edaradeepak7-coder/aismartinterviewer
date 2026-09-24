-- Attribute bookings/interviews to a job posting and allow safe application count bumps

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL;

ALTER TABLE public.interview_bookings
  ADD COLUMN IF NOT EXISTS job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interviews_job_posting_id ON public.interviews(job_posting_id);
CREATE INDEX IF NOT EXISTS idx_interview_bookings_job_posting_id ON public.interview_bookings(job_posting_id);

COMMENT ON COLUMN public.interviews.job_posting_id IS
  'Job posting this interview was booked/applied for (from /jobs Apply → book).';

COMMENT ON COLUMN public.interview_bookings.job_posting_id IS
  'Job posting attributed when candidate books from /book-interview?job=.';

-- Candidates cannot UPDATE job_postings under RLS; use SECURITY DEFINER bump
CREATE OR REPLACE FUNCTION public.increment_job_applications(p_job_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE public.job_postings
  SET
    applications_count = COALESCE(applications_count, 0) + 1,
    updated_at = CURRENT_TIMESTAMP
  WHERE id = p_job_id
  RETURNING applications_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_job_applications(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_job_applications(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_job_applications(UUID) TO service_role;
