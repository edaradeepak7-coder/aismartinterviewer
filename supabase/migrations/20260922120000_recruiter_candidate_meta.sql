-- Recruiter per-candidate bookmarks and tags (replaces browser localStorage)

CREATE TABLE IF NOT EXISTS public.recruiter_candidate_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (recruiter_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_rcm_recruiter ON public.recruiter_candidate_meta(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_rcm_candidate ON public.recruiter_candidate_meta(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rcm_saved ON public.recruiter_candidate_meta(recruiter_id) WHERE saved = TRUE;

CREATE OR REPLACE FUNCTION public.set_rcm_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rcm_updated_at ON public.recruiter_candidate_meta;
CREATE TRIGGER trg_rcm_updated_at
  BEFORE UPDATE ON public.recruiter_candidate_meta
  FOR EACH ROW EXECUTE FUNCTION public.set_rcm_updated_at();

ALTER TABLE public.recruiter_candidate_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rcm_select_own" ON public.recruiter_candidate_meta;
CREATE POLICY "rcm_select_own"
  ON public.recruiter_candidate_meta FOR SELECT TO authenticated
  USING (recruiter_id = auth.uid());

DROP POLICY IF EXISTS "rcm_insert_own" ON public.recruiter_candidate_meta;
CREATE POLICY "rcm_insert_own"
  ON public.recruiter_candidate_meta FOR INSERT TO authenticated
  WITH CHECK (recruiter_id = auth.uid());

DROP POLICY IF EXISTS "rcm_update_own" ON public.recruiter_candidate_meta;
CREATE POLICY "rcm_update_own"
  ON public.recruiter_candidate_meta FOR UPDATE TO authenticated
  USING (recruiter_id = auth.uid())
  WITH CHECK (recruiter_id = auth.uid());

DROP POLICY IF EXISTS "rcm_delete_own" ON public.recruiter_candidate_meta;
CREATE POLICY "rcm_delete_own"
  ON public.recruiter_candidate_meta FOR DELETE TO authenticated
  USING (recruiter_id = auth.uid());
