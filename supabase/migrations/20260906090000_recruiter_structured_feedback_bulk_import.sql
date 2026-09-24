-- Migration: recruiter_structured_feedback and bulk_import_logs
-- Timestamp: 20260906090000

-- Recruiter structured feedback with competency ratings and hiring decisions
CREATE TABLE IF NOT EXISTS public.recruiter_structured_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  competency_ratings JSONB NOT NULL DEFAULT '{}',
  overall_notes TEXT NOT NULL DEFAULT '',
  strengths TEXT DEFAULT '',
  improvement_areas TEXT DEFAULT '',
  decision TEXT CHECK (decision IN ('offer', 'reject', 'hold')),
  email_subject TEXT DEFAULT '',
  email_body TEXT DEFAULT '',
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bulk import logs
CREATE TABLE IF NOT EXISTS public.bulk_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_name TEXT,
  total_rows INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  conflict_count INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  job_role TEXT,
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rsf_interview_id ON public.recruiter_structured_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_rsf_candidate_id ON public.recruiter_structured_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rsf_recruiter_id ON public.recruiter_structured_feedback(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_rsf_decision ON public.recruiter_structured_feedback(decision);
CREATE INDEX IF NOT EXISTS idx_bil_recruiter_id ON public.bulk_import_logs(recruiter_id);

-- Updated_at trigger for structured feedback
CREATE OR REPLACE FUNCTION public.set_rsf_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rsf_updated_at ON public.recruiter_structured_feedback;
CREATE TRIGGER trg_rsf_updated_at
  BEFORE UPDATE ON public.recruiter_structured_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_rsf_updated_at();

-- RLS
ALTER TABLE public.recruiter_structured_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_import_logs ENABLE ROW LEVEL SECURITY;

-- Recruiter structured feedback policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiter_structured_feedback' AND policyname = 'rsf_recruiter_own') THEN
    CREATE POLICY rsf_recruiter_own ON public.recruiter_structured_feedback
      FOR ALL USING (recruiter_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'recruiter_structured_feedback' AND policyname = 'rsf_admin_all') THEN
    CREATE POLICY rsf_admin_all ON public.recruiter_structured_feedback
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE user_profiles.id = auth.uid()
          AND user_profiles.role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

-- Bulk import logs policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'bulk_import_logs' AND policyname = 'bil_recruiter_own') THEN
    CREATE POLICY bil_recruiter_own ON public.bulk_import_logs
      FOR ALL USING (recruiter_id = auth.uid());
  END IF;
END $$;
