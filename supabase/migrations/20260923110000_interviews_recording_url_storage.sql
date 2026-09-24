-- Session recording: URL path on interviews + private storage bucket

ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS recording_url TEXT;

COMMENT ON COLUMN public.interviews.recording_url IS
  'Storage path (or https URL) for session recording under interview-recordings bucket.';

-- Private bucket for WebRTC room recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-recordings',
  'interview-recordings',
  false,
  524288000,
  ARRAY['video/webm', 'video/mp4', 'audio/webm', 'audio/mp4']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "interview_recordings_insert_authenticated" ON storage.objects;
CREATE POLICY "interview_recordings_insert_authenticated"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'interview-recordings');

DROP POLICY IF EXISTS "interview_recordings_select_authenticated" ON storage.objects;
CREATE POLICY "interview_recordings_select_authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'interview-recordings');

DROP POLICY IF EXISTS "interview_recordings_update_authenticated" ON storage.objects;
CREATE POLICY "interview_recordings_update_authenticated"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'interview-recordings')
  WITH CHECK (bucket_id = 'interview-recordings');
