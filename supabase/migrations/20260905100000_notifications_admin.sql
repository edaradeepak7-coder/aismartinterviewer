-- ─── Notifications & Admin Tables ────────────────────────────────────────────

-- Notification types
DROP TYPE IF EXISTS public.notification_type CASCADE;
CREATE TYPE public.notification_type AS ENUM (
  'score_ready',
  'offer_received',
  'booking_confirmed',
  'interview_scheduled',
  'interview_completed',
  'offer_accepted',
  'offer_declined',
  'system'
);

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  type public.notification_type NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  action_url TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Job postings table (for admin management)
CREATE TABLE IF NOT EXISTS public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  location TEXT,
  employment_type TEXT DEFAULT 'full_time',
  description TEXT,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  is_active BOOLEAN DEFAULT true,
  applications_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_job_postings_is_active ON public.job_postings(is_active);
CREATE INDEX IF NOT EXISTS idx_job_postings_created_at ON public.job_postings(created_at DESC);

-- Recruiter availability table already created in 20260905093500_offers_and_slots.sql
-- Only add indexes if not already present (uses slot_date column from that migration)
CREATE INDEX IF NOT EXISTS idx_recruiter_availability_recruiter ON public.recruiter_availability(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_availability_date ON public.recruiter_availability(slot_date);

-- Role benchmarks for interview results comparison
CREATE TABLE IF NOT EXISTS public.role_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name TEXT NOT NULL UNIQUE,
  technical_depth_benchmark INTEGER DEFAULT 75,
  problem_solving_benchmark INTEGER DEFAULT 72,
  system_design_benchmark INTEGER DEFAULT 70,
  communication_benchmark INTEGER DEFAULT 78,
  role_alignment_benchmark INTEGER DEFAULT 74,
  avg_score_benchmark INTEGER DEFAULT 74,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Enable RLS ───────────────────────────────────────────────────────────────

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_benchmarks ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────

-- Notifications: users see their own
DROP POLICY IF EXISTS "users_manage_own_notifications" ON public.notifications;
CREATE POLICY "users_manage_own_notifications"
ON public.notifications FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Job postings: authenticated users can read, admins manage
DROP POLICY IF EXISTS "authenticated_read_job_postings" ON public.job_postings;
CREATE POLICY "authenticated_read_job_postings"
ON public.job_postings FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_manage_job_postings" ON public.job_postings;
CREATE POLICY "authenticated_manage_job_postings"
ON public.job_postings FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Role benchmarks: public read
DROP POLICY IF EXISTS "public_read_role_benchmarks" ON public.role_benchmarks;
CREATE POLICY "public_read_role_benchmarks"
ON public.role_benchmarks FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_manage_role_benchmarks" ON public.role_benchmarks;
CREATE POLICY "authenticated_manage_role_benchmarks"
ON public.role_benchmarks FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- ─── Updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_job_postings_updated_at ON public.job_postings;
CREATE TRIGGER update_job_postings_updated_at
  BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─── Mock Data ────────────────────────────────────────────────────────────────

DO $$
DECLARE
  existing_user_id UUID;
BEGIN
  SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;

  -- Role benchmarks
  INSERT INTO public.role_benchmarks (role_name, technical_depth_benchmark, problem_solving_benchmark, system_design_benchmark, communication_benchmark, role_alignment_benchmark, avg_score_benchmark)
  VALUES
    ('ML Engineer', 80, 78, 75, 72, 76, 76),
    ('Frontend Developer', 75, 74, 68, 80, 77, 75),
    ('Backend Developer', 82, 80, 78, 70, 74, 77),
    ('Full Stack Developer', 76, 75, 72, 74, 75, 74),
    ('Data Scientist', 83, 82, 70, 71, 78, 77),
    ('DevOps Engineer', 78, 76, 80, 72, 75, 76),
    ('Product Manager', 65, 72, 68, 85, 82, 74)
  ON CONFLICT (role_name) DO NOTHING;

  -- Job postings
  INSERT INTO public.job_postings (id, title, department, location, employment_type, description, requirements, salary_min, salary_max, is_active, applications_count, created_by)
  VALUES
    (gen_random_uuid(), 'Senior ML Engineer', 'Engineering', 'Remote', 'full_time', 'Build and deploy machine learning models at scale.', '5+ years ML experience, Python, TensorFlow/PyTorch', 140000, 180000, true, 12, existing_user_id),
    (gen_random_uuid(), 'Frontend Developer', 'Engineering', 'New York, NY', 'full_time', 'Build beautiful, responsive user interfaces.', '3+ years React experience, TypeScript, CSS', 110000, 145000, true, 8, existing_user_id),
    (gen_random_uuid(), 'Data Scientist', 'Analytics', 'San Francisco, CA', 'full_time', 'Analyze complex datasets and build predictive models.', 'PhD or MS in Statistics/CS, Python, SQL', 130000, 165000, true, 15, existing_user_id),
    (gen_random_uuid(), 'DevOps Engineer', 'Infrastructure', 'Remote', 'full_time', 'Manage cloud infrastructure and CI/CD pipelines.', '4+ years DevOps, AWS/GCP, Kubernetes, Terraform', 125000, 160000, false, 6, existing_user_id)
  ON CONFLICT (id) DO NOTHING;

  -- Notifications for existing user
  IF existing_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (id, user_id, type, title, message, is_read, action_url)
    VALUES
      (gen_random_uuid(), existing_user_id, 'score_ready', 'Interview Score Ready', 'Your ML Engineer interview score is now available. You scored 87/100.', false, '/interview-results'),
      (gen_random_uuid(), existing_user_id, 'offer_received', 'Job Offer Received', 'Congratulations! TechCorp has extended you an offer for the Senior ML Engineer position.', false, '/job-offers'),
      (gen_random_uuid(), existing_user_id, 'booking_confirmed', 'Interview Booking Confirmed', 'Your interview with Sarah Reeves is confirmed for Sep 10 at 2:00 PM.', true, '/book-interview'),
      (gen_random_uuid(), existing_user_id, 'interview_scheduled', 'Interview Scheduled', 'Your technical interview for Frontend Developer has been scheduled.', true, '/invitations'),
      (gen_random_uuid(), existing_user_id, 'system', 'Welcome to AI Interviewer', 'Complete your profile to get personalized interview recommendations.', true, '/')
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
