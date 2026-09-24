-- Private recruiter scratchpad on live/WebRTC interviews.
-- Not intended for candidate-facing selects (app strips / omits this column).

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

COMMENT ON COLUMN public.interviews.recruiter_notes IS
  'Private recruiter notes from live interview; do not expose to candidates.';
