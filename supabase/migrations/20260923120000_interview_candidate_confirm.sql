-- Candidate invite response (accept) without colliding with live in_progress status

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS candidate_confirmed BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS candidate_responded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.interviews.candidate_confirmed IS
  'True when the candidate accepted a scheduled interview invitation.';

COMMENT ON COLUMN public.interviews.candidate_responded_at IS
  'When the candidate last accepted or declined the invitation.';
