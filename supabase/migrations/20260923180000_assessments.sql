-- Assessments + assessment_results (matches /api/assessments insert shape)

CREATE TABLE IF NOT EXISTS public.assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 60,
  total_points INTEGER NOT NULL DEFAULT 100,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published', 'closed')),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessments_created_by ON public.assessments(created_by);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON public.assessments(status);
CREATE INDEX IF NOT EXISTS idx_assessments_created_at ON public.assessments(created_at DESC);

CREATE TABLE IF NOT EXISTS public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  recruiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  total_points INTEGER NOT NULL DEFAULT 100,
  time_taken_minutes INTEGER NOT NULL DEFAULT 0,
  mcq_score INTEGER NOT NULL DEFAULT 0,
  coding_score INTEGER NOT NULL DEFAULT 0,
  subjective_score INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('passed', 'failed', 'pending')),
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment ON public.assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_candidate ON public.assessment_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_recruiter ON public.assessment_results(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_status ON public.assessment_results(status);

CREATE OR REPLACE FUNCTION public.set_assessments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assessments_updated_at ON public.assessments;
CREATE TRIGGER trg_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_assessments_updated_at();

ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assessments' AND policyname = 'assessments_staff_all'
  ) THEN
    CREATE POLICY assessments_staff_all ON public.assessments
      FOR ALL TO authenticated
      USING (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty', 'institution_admin')
        )
      )
      WITH CHECK (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty', 'institution_admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'assessment_results' AND policyname = 'assessment_results_staff_all'
  ) THEN
    CREATE POLICY assessment_results_staff_all ON public.assessment_results
      FOR ALL TO authenticated
      USING (
        recruiter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty', 'institution_admin')
        )
      )
      WITH CHECK (
        recruiter_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'evaluator', 'faculty', 'institution_admin')
        )
      );
  END IF;
END $$;
