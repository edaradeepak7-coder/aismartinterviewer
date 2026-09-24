-- Candidate learning surfaces: leaderboard, courses, packs, LSRW, coding, certs, referrals, ATS

-- ─── leaderboard_scores ───────────────────────────────────────────────────────
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

-- ─── courses ──────────────────────────────────────────────────────────────────
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

-- ─── company packs ────────────────────────────────────────────────────────────
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

-- ─── LSRW ─────────────────────────────────────────────────────────────────────
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

-- ─── coding ───────────────────────────────────────────────────────────────────
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

-- ─── certificates ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credential_code TEXT NOT NULL UNIQUE,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_certificates_user ON public.certificates(user_id);

-- ─── referrals ────────────────────────────────────────────────────────────────
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

-- ─── ATS scans ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ats_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL DEFAULT '',
  score INTEGER NOT NULL DEFAULT 0,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ats_scans_user ON public.ats_scans(user_id);

-- ─── updated_at trigger for leaderboard ───────────────────────────────────────
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

-- ─── RLS ──────────────────────────────────────────────────────────────────────
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

-- Certificates, referrals, ATS — own rows only
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
