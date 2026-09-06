-- ─── RLS Enforcement + Recruiter Feedback Table ──────────────────────────────

-- ─── 1. Recruiter Feedback Table ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recruiter_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  strengths TEXT NOT NULL DEFAULT '',
  gaps TEXT NOT NULL DEFAULT '',
  recommendation_notes TEXT NOT NULL DEFAULT '',
  overall_recommendation TEXT CHECK (overall_recommendation IN ('strong_yes', 'yes', 'maybe', 'no')),
  is_confidential BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recruiter_feedback_interview ON public.recruiter_feedback(interview_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_feedback_candidate ON public.recruiter_feedback(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_feedback_recruiter ON public.recruiter_feedback(recruiter_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_recruiter_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_recruiter_feedback_updated_at ON public.recruiter_feedback;
CREATE TRIGGER trg_recruiter_feedback_updated_at
  BEFORE UPDATE ON public.recruiter_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_recruiter_feedback_updated_at();

-- ─── 2. Enable RLS on recruiter_feedback ─────────────────────────────────────

ALTER TABLE public.recruiter_feedback ENABLE ROW LEVEL SECURITY;

-- Recruiters and admins can read all feedback
DROP POLICY IF EXISTS "recruiter_feedback_select_recruiter_admin" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_select_recruiter_admin"
  ON public.recruiter_feedback FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('recruiter', 'admin')
    )
  );

-- Recruiters can insert their own feedback
DROP POLICY IF EXISTS "recruiter_feedback_insert_recruiter" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_insert_recruiter"
  ON public.recruiter_feedback FOR INSERT
  WITH CHECK (
    recruiter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('recruiter', 'admin')
    )
  );

-- Recruiters can update their own feedback
DROP POLICY IF EXISTS "recruiter_feedback_update_own" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_update_own"
  ON public.recruiter_feedback FOR UPDATE
  USING (
    recruiter_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('recruiter', 'admin')
    )
  );

-- Candidates CANNOT access recruiter_feedback (no SELECT policy for candidates)

-- ─── 3. Tighten RLS on existing tables ───────────────────────────────────────

-- interviews: candidates see only their own; recruiters/admins see all
DROP POLICY IF EXISTS "interviews_candidate_own" ON public.interviews;
CREATE POLICY "interviews_candidate_own"
  ON public.interviews FOR SELECT
  USING (
    -- Recruiter/admin sees all
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
    OR
    -- Candidate sees only their own
    candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- candidates table: candidates see only their own row; recruiters/admins see all
DROP POLICY IF EXISTS "candidates_select_policy" ON public.candidates;
CREATE POLICY "candidates_select_policy"
  ON public.candidates FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
    OR user_id = auth.uid()
  );

-- interview_results: candidates see only their own; recruiters/admins see all
DROP POLICY IF EXISTS "interview_results_select_policy" ON public.interview_results;
CREATE POLICY "interview_results_select_policy"
  ON public.interview_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
    OR interview_id IN (
      SELECT i.id FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- responses: candidates see only their own; recruiters/admins see all
DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
CREATE POLICY "responses_select_policy"
  ON public.responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
    OR interview_id IN (
      SELECT i.id FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- notifications: users see only their own (already set, reinforce)
DROP POLICY IF EXISTS "notifications_own_user" ON public.notifications;
CREATE POLICY "notifications_own_user"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

-- job_postings: candidates can read active postings; recruiters/admins can manage
DROP POLICY IF EXISTS "job_postings_candidate_read" ON public.job_postings;
CREATE POLICY "job_postings_candidate_read"
  ON public.job_postings FOR SELECT
  USING (
    is_active = true
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
  );

-- role_benchmarks: readable by recruiters/admins only
DROP POLICY IF EXISTS "role_benchmarks_recruiter_admin" ON public.role_benchmarks;
CREATE POLICY "role_benchmarks_recruiter_admin"
  ON public.role_benchmarks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role IN ('recruiter', 'admin')
    )
  );

-- user_profiles: users see only their own; admins see all
DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_select_policy"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
