-- Institution Applications & Candidate Registration Extension
-- Adds institution_applications table and extends institution_candidates with registration fields

-- 1. Institution Applications Table
CREATE TABLE IF NOT EXISTS public.institution_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  institution_type TEXT NOT NULL DEFAULT 'Engineering',
  address TEXT,
  website TEXT,
  seats_requested INTEGER NOT NULL DEFAULT 50,
  payment_method TEXT NOT NULL DEFAULT 'offline',
  payment_reference TEXT,
  payment_amount NUMERIC(12,2),
  bank_name TEXT,
  transfer_date DATE,
  transfer_screenshot_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  seats_allocated INTEGER,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_institution_applications_status ON public.institution_applications(status);
CREATE INDEX IF NOT EXISTS idx_institution_applications_created_at ON public.institution_applications(created_at DESC);

ALTER TABLE public.institution_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_institution_applications" ON public.institution_applications;
CREATE POLICY "admin_manage_institution_applications"
ON public.institution_applications
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 2. Extend institution_candidates with registration fields (if not already present)
ALTER TABLE public.institution_candidates
  ADD COLUMN IF NOT EXISTS program TEXT,
  ADD COLUMN IF NOT EXISTS year TEXT,
  ADD COLUMN IF NOT EXISTS course TEXT,
  ADD COLUMN IF NOT EXISTS branch TEXT,
  ADD COLUMN IF NOT EXISTS section TEXT,
  ADD COLUMN IF NOT EXISTS institution_code TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_token TEXT,
  ADD COLUMN IF NOT EXISTS verification_sent_at TIMESTAMPTZ;

-- 3. Mock institution applications for demo
DO $$
BEGIN
  INSERT INTO public.institution_applications (
    id, institution_name, contact_name, contact_email, contact_phone,
    institution_type, address, website, seats_requested, payment_method,
    payment_reference, payment_amount, bank_name, transfer_date, status,
    notes, created_at
  ) VALUES
    (gen_random_uuid(), 'VIT Vellore', 'Dr. Ramesh Kumar', 'ramesh@vit.ac.in', '+91-9876543210',
     'Engineering', 'Vellore, Tamil Nadu', 'https://vit.ac.in', 200, 'offline',
     'NEFT20260901VIT001', 59800.00, 'State Bank of India', '2026-09-01', 'pending',
     'Large batch — 200 seats for B.Tech final year', now() - interval '2 days'),
    (gen_random_uuid(), 'BITS Pilani', 'Prof. Anita Sharma', 'anita@bits.ac.in', '+91-9123456789',
     'Engineering', 'Pilani, Rajasthan', 'https://bits-pilani.ac.in', 150, 'offline',
     'RTGS20260902BITS002', 44850.00, 'HDFC Bank', '2026-09-02', 'pending',
     'BITS Pilani campus — 150 seats for placement season', now() - interval '1 day'),
    (gen_random_uuid(), 'IIM Ahmedabad', 'Dr. Priya Nair', 'priya@iima.ac.in', '+91-9988776655',
     'Management', 'Ahmedabad, Gujarat', 'https://iima.ac.in', 80, 'online',
     NULL, 23920.00, NULL, NULL, 'pending',
     'MBA batch — 80 seats for summer placements', now() - interval '3 hours'),
    (gen_random_uuid(), 'NIT Warangal', 'Prof. Suresh Reddy', 'suresh@nitw.ac.in', '+91-9654321098',
     'Engineering', 'Warangal, Telangana', 'https://nitw.ac.in', 120, 'offline',
     'IMPS20260830NIT003', 35880.00, 'Axis Bank', '2026-08-30', 'approved',
     NULL, now() - interval '5 days')
  ON CONFLICT (id) DO NOTHING;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
