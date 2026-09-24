-- Pending remote migrations (paste into Supabase SQL Editor if CLI unavailable)

-- ========== 20260923180000_assessments.sql ==========
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


-- ========== 20260924100000_placement_drives.sql ==========
-- Placement drives + enrollments (campus hiring MVP)

CREATE TABLE IF NOT EXISTS public.placement_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL DEFAULT '',
  location TEXT,
  package_lpa_min NUMERIC(8,2),
  package_lpa_max NUMERIC(8,2),
  drive_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  selected_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placement_drives_status ON public.placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_placement_drives_created_by ON public.placement_drives(created_by);
CREATE INDEX IF NOT EXISTS idx_placement_drives_drive_date ON public.placement_drives(drive_date);

CREATE TABLE IF NOT EXISTS public.placement_drive_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  institution_candidate_id UUID REFERENCES public.institution_candidates(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'registered'
    CHECK (stage IN ('registered', 'shortlisted', 'interviewing', 'selected', 'rejected', 'offered')),
  package_lpa NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (drive_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pdc_drive ON public.placement_drive_candidates(drive_id);
CREATE INDEX IF NOT EXISTS idx_pdc_stage ON public.placement_drive_candidates(stage);
CREATE INDEX IF NOT EXISTS idx_pdc_candidate ON public.placement_drive_candidates(candidate_id);

CREATE OR REPLACE FUNCTION public.set_placement_drives_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_placement_drives_updated_at ON public.placement_drives;
CREATE TRIGGER trg_placement_drives_updated_at
  BEFORE UPDATE ON public.placement_drives
  FOR EACH ROW EXECUTE FUNCTION public.set_placement_drives_updated_at();

DROP TRIGGER IF EXISTS trg_pdc_updated_at ON public.placement_drive_candidates;
CREATE TRIGGER trg_pdc_updated_at
  BEFORE UPDATE ON public.placement_drive_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_placement_drives_updated_at();

-- Keep selected_count in sync when stage changes to/from selected|offered
CREATE OR REPLACE FUNCTION public.sync_placement_drive_selected_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  did UUID;
BEGIN
  did := COALESCE(NEW.drive_id, OLD.drive_id);
  UPDATE public.placement_drives
  SET selected_count = (
    SELECT COUNT(*)::INTEGER FROM public.placement_drive_candidates
    WHERE drive_id = did AND stage IN ('selected', 'offered')
  ),
  updated_at = NOW()
  WHERE id = did;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_pdc_sync_selected ON public.placement_drive_candidates;
CREATE TRIGGER trg_pdc_sync_selected
  AFTER INSERT OR UPDATE OF stage OR DELETE ON public.placement_drive_candidates
  FOR EACH ROW EXECUTE FUNCTION public.sync_placement_drive_selected_count();

ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drive_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'placement_drives' AND policyname = 'placement_drives_staff'
  ) THEN
    CREATE POLICY placement_drives_staff ON public.placement_drives
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'placement_drive_candidates' AND policyname = 'placement_drive_candidates_staff'
  ) THEN
    CREATE POLICY placement_drive_candidates_staff ON public.placement_drive_candidates
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      );
  END IF;
END $$;


-- ========== 20260924120000_rls_audit_admin_policies.sql ==========
-- Broaden rls_audit_events RLS to match user_profiles admin roles
-- (original policy only checked auth.users metadata for role = 'admin')

DROP POLICY IF EXISTS "admin_full_access_rls_audit_events" ON public.rls_audit_events;

CREATE POLICY "admins_manage_rls_audit_events"
ON public.rls_audit_events FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- Allow service / server inserts from authenticated clients that pass API auth
-- (API still gates; this covers edge writers)
DROP POLICY IF EXISTS "service_insert_rls_audit_events" ON public.rls_audit_events;
CREATE POLICY "service_insert_rls_audit_events"
ON public.rls_audit_events FOR INSERT TO authenticated
WITH CHECK (true);


-- ========== 20260924140000_candidate_surfaces.sql ==========
-- Candidate learning surfaces: leaderboard, courses, packs, LSRW, coding, certs, referrals, ATS

-- â”€â”€â”€ leaderboard_scores â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.leaderboard_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL DEFAULT 0,
  rank_period TEXT NOT NULL DEFAULT 'all'
    CHECK (rank_period IN ('today', 'week', 'month', 'all')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, rank_period)
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_scores_period_points
  ON public.leaderboard_scores(rank_period, points DESC);

-- â”€â”€â”€ courses â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'Beginner'
    CHECK (level IN ('Beginner', 'Intermediate', 'Advanced')),
  duration_hours NUMERIC(6,1) NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_published ON public.courses(is_published);

CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  progress_pct INTEGER NOT NULL DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON public.course_enrollments(user_id);

-- â”€â”€â”€ company packs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.company_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  credit_cost INTEGER NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_packs_published ON public.company_packs(is_published);

CREATE TABLE IF NOT EXISTS public.company_pack_unlocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.company_packs(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, pack_id)
);

CREATE INDEX IF NOT EXISTS idx_company_pack_unlocks_user ON public.company_pack_unlocks(user_id);

-- â”€â”€â”€ LSRW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.lsrw_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill TEXT NOT NULL CHECK (skill IN ('listening', 'speaking', 'reading', 'writing')),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  credit_cost INTEGER NOT NULL DEFAULT 0 CHECK (credit_cost >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lsrw_exercises_skill ON public.lsrw_exercises(skill);

CREATE TABLE IF NOT EXISTS public.lsrw_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.lsrw_exercises(id) ON DELETE CASCADE,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lsrw_attempts_user ON public.lsrw_attempts(user_id);

-- â”€â”€â”€ coding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.coding_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'easy'
    CHECK (difficulty IN ('easy', 'medium', 'hard')),
  prompt TEXT NOT NULL DEFAULT '',
  starter_code TEXT NOT NULL DEFAULT '',
  tests JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_problems_difficulty ON public.coding_problems(difficulty);

CREATE TABLE IF NOT EXISTS public.coding_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem_id UUID NOT NULL REFERENCES public.coding_problems(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'error')),
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coding_submissions_user ON public.coding_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_coding_submissions_problem ON public.coding_submissions(problem_id);

-- â”€â”€â”€ certificates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credential_code TEXT NOT NULL UNIQUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);

-- â”€â”€â”€ referrals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'signed_up', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_email ON public.referrals(invitee_email);

-- â”€â”€â”€ ATS scans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.ats_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ats_scans_user ON public.ats_scans(user_id);

-- â”€â”€â”€ updated_at trigger for leaderboard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE OR REPLACE FUNCTION public.set_leaderboard_scores_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leaderboard_scores_updated_at ON public.leaderboard_scores;
CREATE TRIGGER trg_leaderboard_scores_updated_at
  BEFORE UPDATE ON public.leaderboard_scores
  FOR EACH ROW EXECUTE FUNCTION public.set_leaderboard_scores_updated_at();

-- â”€â”€â”€ RLS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
ALTER TABLE public.leaderboard_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_pack_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lsrw_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lsrw_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_problems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coding_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_scans ENABLE ROW LEVEL SECURITY;

-- Leaderboard: authenticated can read all; users manage own rows
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_scores' AND policyname = 'leaderboard_scores_select') THEN
    CREATE POLICY leaderboard_scores_select ON public.leaderboard_scores FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'leaderboard_scores' AND policyname = 'leaderboard_scores_own_write') THEN
    CREATE POLICY leaderboard_scores_own_write ON public.leaderboard_scores FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Courses catalog: published readable; enrollments own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'courses' AND policyname = 'courses_select_published') THEN
    CREATE POLICY courses_select_published ON public.courses FOR SELECT TO authenticated
      USING (
        is_published = true
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'org_admin', 'faculty')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'course_enrollments' AND policyname = 'course_enrollments_own') THEN
    CREATE POLICY course_enrollments_own ON public.course_enrollments FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Company packs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_packs' AND policyname = 'company_packs_select_published') THEN
    CREATE POLICY company_packs_select_published ON public.company_packs FOR SELECT TO authenticated
      USING (
        is_published = true
        OR EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'company_pack_unlocks' AND policyname = 'company_pack_unlocks_own') THEN
    CREATE POLICY company_pack_unlocks_own ON public.company_pack_unlocks FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- LSRW
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lsrw_exercises' AND policyname = 'lsrw_exercises_select') THEN
    CREATE POLICY lsrw_exercises_select ON public.lsrw_exercises FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'lsrw_attempts' AND policyname = 'lsrw_attempts_own') THEN
    CREATE POLICY lsrw_attempts_own ON public.lsrw_attempts FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Coding
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coding_problems' AND policyname = 'coding_problems_select') THEN
    CREATE POLICY coding_problems_select ON public.coding_problems FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'coding_submissions' AND policyname = 'coding_submissions_own') THEN
    CREATE POLICY coding_submissions_own ON public.coding_submissions FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Certificates, referrals, ATS â€” own rows only
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'certificates' AND policyname = 'certificates_own') THEN
    CREATE POLICY certificates_own ON public.certificates FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'referrals' AND policyname = 'referrals_own') THEN
    CREATE POLICY referrals_own ON public.referrals FOR ALL TO authenticated
      USING (referrer_id = auth.uid()) WITH CHECK (referrer_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'ats_scans' AND policyname = 'ats_scans_own') THEN
    CREATE POLICY ats_scans_own ON public.ats_scans FOR ALL TO authenticated
      USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
  END IF;
END $$;


-- ========== 20260924150000_admin_ops_surfaces.sql ==========
-- Admin / ops surfaces: CRM, skills tree, email templates, reports, health probes, AI provider/usage

-- â”€â”€â”€ Helper: admin role check via user_profiles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
-- Policies use EXISTS on user_profiles for consistency with requireAdmin.

-- â”€â”€â”€ 1. Skills nodes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.skills_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.skills_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_nodes_parent ON public.skills_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_skills_nodes_sort ON public.skills_nodes(sort_order);

ALTER TABLE public.skills_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_skills_nodes" ON public.skills_nodes;
CREATE POLICY "admins_manage_skills_nodes"
ON public.skills_nodes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- â”€â”€â”€ 2. Email templates â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_email_templates" ON public.email_templates;
CREATE POLICY "admins_manage_email_templates"
ON public.email_templates FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

INSERT INTO public.email_templates (slug, name, subject, body_html)
VALUES
  ('enrollment', 'Course Enrollment', 'You''re enrolled in {{course_name}}!', '<p>Hi {{candidate_name}},</p><p>You''ve enrolled in <strong>{{course_name}}</strong>.</p>'),
  ('completion', 'Course Completion', 'You completed {{course_name}}', '<p>Hi {{candidate_name}},</p><p>You completed <strong>{{course_name}}</strong>.</p>'),
  ('achievement', 'Achievement Unlock', 'Achievement unlocked: {{achievement_name}}', '<p>Hi {{candidate_name}},</p><p>You unlocked <strong>{{achievement_name}}</strong>.</p>'),
  ('interview', 'Interview Scheduled', 'Interview scheduled: {{interview_type}}', '<p>Hi {{candidate_name}},</p><p>Your interview is scheduled for {{interview_date}}.</p>'),
  ('leaderboard', 'Leaderboard Milestone', 'You''re in the Top {{rank}}', '<p>Hi {{candidate_name}},</p><p>You reached rank #{{rank}}.</p>')
ON CONFLICT (slug) DO NOTHING;

-- â”€â”€â”€ 3. CRM leads â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  value NUMERIC NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON public.crm_leads(created_at DESC);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_crm_leads" ON public.crm_leads;
CREATE POLICY "admins_manage_crm_leads"
ON public.crm_leads FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- â”€â”€â”€ 4. CRM tasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON public.crm_tasks(due_at);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_crm_tasks" ON public.crm_tasks;
CREATE POLICY "admins_manage_crm_tasks"
ON public.crm_tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- â”€â”€â”€ 5. Report definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_created ON public.report_definitions(created_at DESC);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_report_definitions" ON public.report_definitions;
CREATE POLICY "admins_manage_report_definitions"
ON public.report_definitions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- â”€â”€â”€ 6. Health probe results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.health_probe_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'warn', 'fail', 'skip')),
  latency_ms INTEGER,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_probe_results_key ON public.health_probe_results(probe_key);
CREATE INDEX IF NOT EXISTS idx_health_probe_results_created ON public.health_probe_results(created_at DESC);

ALTER TABLE public.health_probe_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_health_probe_results" ON public.health_probe_results;
CREATE POLICY "admins_manage_health_probe_results"
ON public.health_probe_results FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- â”€â”€â”€ 7. AI provider configs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_ai_provider_configs" ON public.ai_provider_configs;
CREATE POLICY "admins_manage_ai_provider_configs"
ON public.ai_provider_configs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

INSERT INTO public.ai_provider_configs (provider_key, display_name, enabled, config)
VALUES
  ('groq', 'Groq', true, '{"type":"LLM","role":"primary","model":"llama-3.3-70b"}'::jsonb),
  ('openai', 'OpenAI', true, '{"type":"LLM","role":"fallback","model":"gpt-4o"}'::jsonb),
  ('deepgram', 'Deepgram', true, '{"type":"STT","role":"primary","model":"nova-2"}'::jsonb),
  ('cartesia', 'Cartesia', true, '{"type":"TTS","role":"primary","model":"sonic-english"}'::jsonb)
ON CONFLICT (provider_key) DO NOTHING;

-- â”€â”€â”€ 8. AI usage logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "admins_read_ai_usage_logs"
ON public.ai_usage_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

DROP POLICY IF EXISTS "admins_insert_ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "admins_insert_ai_usage_logs"
ON public.ai_usage_logs FOR INSERT TO authenticated
WITH CHECK (true);


-- ========== 20260924160000_interview_ratings.sql ==========
-- Candidate interview experience ratings (1â€“5 stars)

CREATE TABLE IF NOT EXISTS public.interview_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (interview_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_interview_ratings_user_id
  ON public.interview_ratings(user_id);

CREATE INDEX IF NOT EXISTS idx_interview_ratings_interview_id
  ON public.interview_ratings(interview_id);

ALTER TABLE public.interview_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_interview_ratings" ON public.interview_ratings;
CREATE POLICY "users_manage_own_interview_ratings"
ON public.interview_ratings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());


-- ========== 20260924161000_alert_threshold_slack.sql ==========
-- Add Slack notification columns to alert_thresholds
ALTER TABLE public.alert_thresholds
  ADD COLUMN IF NOT EXISTS notify_slack boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS slack_webhook_url text;


-- ========== 20260924161100_institution_admin_email.sql ==========
-- Optional admin_email on institutions (email already stores contact; this is an explicit alias)
ALTER TABLE public.institutions
  ADD COLUMN IF NOT EXISTS admin_email text;

