-- ─── Fix: Infinite Recursion in user_profiles RLS Policy ────────────────────
-- Root cause: user_profiles_select_policy used EXISTS (SELECT 1 FROM user_profiles ...)
-- which causes infinite recursion when any policy on OTHER tables also queries user_profiles.
-- Fix: Create a SECURITY DEFINER helper function that bypasses RLS to read the current
-- user's role, then replace all inline subqueries with this function.

-- ─── 1. Helper function: get current user's role (bypasses RLS) ──────────────

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ─── 2. Fix user_profiles policy (was self-referencing → infinite recursion) ──

DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_select_policy"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role() = 'admin'
  );

-- ─── 3. Fix interviews policy ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "interviews_candidate_own" ON public.interviews;
CREATE POLICY "interviews_candidate_own"
  ON public.interviews FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
    OR candidate_id IN (
      SELECT id FROM public.candidates WHERE user_id = auth.uid()
    )
  );

-- ─── 4. Fix candidates policy ────────────────────────────────────────────────

DROP POLICY IF EXISTS "candidates_select_policy" ON public.candidates;
CREATE POLICY "candidates_select_policy"
  ON public.candidates FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
    OR user_id = auth.uid()
  );

-- ─── 5. Fix interview_results policy ─────────────────────────────────────────

DROP POLICY IF EXISTS "interview_results_select_policy" ON public.interview_results;
CREATE POLICY "interview_results_select_policy"
  ON public.interview_results FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
    OR interview_id IN (
      SELECT i.id FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ─── 6. Fix responses policy ─────────────────────────────────────────────────

DROP POLICY IF EXISTS "responses_select_policy" ON public.responses;
CREATE POLICY "responses_select_policy"
  ON public.responses FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
    OR interview_id IN (
      SELECT i.id FROM public.interviews i
      JOIN public.candidates c ON c.id = i.candidate_id
      WHERE c.user_id = auth.uid()
    )
  );

-- ─── 7. Fix job_postings policy ──────────────────────────────────────────────

DROP POLICY IF EXISTS "job_postings_candidate_read" ON public.job_postings;
CREATE POLICY "job_postings_candidate_read"
  ON public.job_postings FOR SELECT
  USING (
    is_active = true
    OR public.get_my_role() IN ('recruiter', 'admin')
  );

-- ─── 8. Fix role_benchmarks policy ───────────────────────────────────────────

DROP POLICY IF EXISTS "role_benchmarks_recruiter_admin" ON public.role_benchmarks;
CREATE POLICY "role_benchmarks_recruiter_admin"
  ON public.role_benchmarks FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
  );

-- ─── 9. Fix recruiter_feedback policies ──────────────────────────────────────

DROP POLICY IF EXISTS "recruiter_feedback_select_recruiter_admin" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_select_recruiter_admin"
  ON public.recruiter_feedback FOR SELECT
  USING (
    public.get_my_role() IN ('recruiter', 'admin')
  );

DROP POLICY IF EXISTS "recruiter_feedback_insert_recruiter" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_insert_recruiter"
  ON public.recruiter_feedback FOR INSERT
  WITH CHECK (
    recruiter_id = auth.uid()
    AND public.get_my_role() IN ('recruiter', 'admin')
  );

DROP POLICY IF EXISTS "recruiter_feedback_update_own" ON public.recruiter_feedback;
CREATE POLICY "recruiter_feedback_update_own"
  ON public.recruiter_feedback FOR UPDATE
  USING (
    recruiter_id = auth.uid()
    AND public.get_my_role() IN ('recruiter', 'admin')
  );
