-- Candidate interview experience ratings (1–5 stars)

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
