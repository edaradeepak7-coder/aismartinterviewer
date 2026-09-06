-- ============================================================
-- Job Offers, Recruiter Availability & Interview Bookings
-- ============================================================

-- 1. ENUM TYPES
DROP TYPE IF EXISTS public.offer_status CASCADE;
CREATE TYPE public.offer_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

DROP TYPE IF EXISTS public.slot_status CASCADE;
CREATE TYPE public.slot_status AS ENUM ('available', 'booked', 'cancelled');

-- 2. TABLES

-- job_offers
CREATE TABLE IF NOT EXISTS public.job_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE,
  recruiter_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL DEFAULT 'Meridian Technologies',
  department TEXT,
  salary_range TEXT,
  start_date TEXT,
  offer_details TEXT,
  status public.offer_status NOT NULL DEFAULT 'pending',
  candidate_feedback TEXT,
  next_steps JSONB DEFAULT '[]'::jsonb,
  interview_prep_tips JSONB DEFAULT '[]'::jsonb,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- recruiter_availability (time slots recruiters open for booking)
CREATE TABLE IF NOT EXISTS public.recruiter_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recruiter_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 45,
  status public.slot_status NOT NULL DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- interview_bookings (candidate selects a slot)
CREATE TABLE IF NOT EXISTS public.interview_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.recruiter_availability(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  notes TEXT,
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_job_offers_candidate_id ON public.job_offers(candidate_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_interview_id ON public.job_offers(interview_id);
CREATE INDEX IF NOT EXISTS idx_job_offers_status ON public.job_offers(status);
CREATE INDEX IF NOT EXISTS idx_recruiter_availability_recruiter_id ON public.recruiter_availability(recruiter_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_availability_slot_date ON public.recruiter_availability(slot_date);
CREATE INDEX IF NOT EXISTS idx_recruiter_availability_status ON public.recruiter_availability(status);
CREATE INDEX IF NOT EXISTS idx_interview_bookings_candidate_id ON public.interview_bookings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_interview_bookings_slot_id ON public.interview_bookings(slot_id);

-- 4. FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_slot_on_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.recruiter_availability SET status = 'booked' WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.recruiter_availability SET status = 'available' WHERE id = OLD.slot_id;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. ENABLE RLS
ALTER TABLE public.job_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiter_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_bookings ENABLE ROW LEVEL SECURITY;

-- 6. RLS POLICIES

-- job_offers: all authenticated can read, manage their own
DROP POLICY IF EXISTS "authenticated_read_job_offers" ON public.job_offers;
CREATE POLICY "authenticated_read_job_offers"
ON public.job_offers FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_insert_job_offers" ON public.job_offers;
CREATE POLICY "authenticated_insert_job_offers"
ON public.job_offers FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_update_job_offers" ON public.job_offers;
CREATE POLICY "authenticated_update_job_offers"
ON public.job_offers FOR UPDATE TO authenticated
USING (true) WITH CHECK (true);

-- recruiter_availability: all authenticated can read, recruiters manage their own
DROP POLICY IF EXISTS "authenticated_read_recruiter_availability" ON public.recruiter_availability;
CREATE POLICY "authenticated_read_recruiter_availability"
ON public.recruiter_availability FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "authenticated_manage_recruiter_availability" ON public.recruiter_availability;
CREATE POLICY "authenticated_manage_recruiter_availability"
ON public.recruiter_availability FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- interview_bookings: all authenticated can read and manage
DROP POLICY IF EXISTS "authenticated_manage_interview_bookings" ON public.interview_bookings;
CREATE POLICY "authenticated_manage_interview_bookings"
ON public.interview_bookings FOR ALL TO authenticated
USING (true) WITH CHECK (true);

-- 7. TRIGGERS
DROP TRIGGER IF EXISTS update_job_offers_updated_at ON public.job_offers;
CREATE TRIGGER update_job_offers_updated_at
  BEFORE UPDATE ON public.job_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_recruiter_availability_updated_at ON public.recruiter_availability;
CREATE TRIGGER update_recruiter_availability_updated_at
  BEFORE UPDATE ON public.recruiter_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS update_interview_bookings_updated_at ON public.interview_bookings;
CREATE TRIGGER update_interview_bookings_updated_at
  BEFORE UPDATE ON public.interview_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS on_booking_created ON public.interview_bookings;
CREATE TRIGGER on_booking_created
  AFTER INSERT ON public.interview_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_slot_on_booking();

DROP TRIGGER IF EXISTS on_booking_deleted ON public.interview_bookings;
CREATE TRIGGER on_booking_deleted
  AFTER DELETE ON public.interview_bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_slot_on_booking();

-- 8. MOCK DATA
DO $$
DECLARE
  existing_recruiter_id UUID;
  existing_candidate_id UUID;
  existing_interview_id UUID;
  offer_id_1 UUID := gen_random_uuid();
  offer_id_2 UUID := gen_random_uuid();
  slot_id_1 UUID := gen_random_uuid();
  slot_id_2 UUID := gen_random_uuid();
  slot_id_3 UUID := gen_random_uuid();
  slot_id_4 UUID := gen_random_uuid();
  slot_id_5 UUID := gen_random_uuid();
  slot_id_6 UUID := gen_random_uuid();
BEGIN
  SELECT id INTO existing_recruiter_id FROM public.user_profiles WHERE role = 'recruiter' LIMIT 1;
  SELECT id INTO existing_candidate_id FROM public.candidates LIMIT 1;
  SELECT id INTO existing_interview_id FROM public.interviews WHERE status = 'evaluated' LIMIT 1;

  IF existing_recruiter_id IS NOT NULL AND existing_candidate_id IS NOT NULL THEN
    -- Job offers
    INSERT INTO public.job_offers (id, interview_id, candidate_id, recruiter_id, role, company, department, salary_range, start_date, offer_details, status, next_steps, interview_prep_tips)
    VALUES
      (offer_id_1, existing_interview_id, existing_candidate_id, existing_recruiter_id,
       'Senior Frontend Engineer', 'Meridian Technologies', 'Engineering',
       '$130,000 – $155,000 / year', 'October 1, 2026',
       'We are excited to extend this offer following your outstanding interview performance. You will join our core product team building next-generation AI-powered interfaces.',
       'pending',
       '[{"step":"Review and sign offer letter","deadline":"Sep 12, 2026","completed":false},{"step":"Complete background check","deadline":"Sep 15, 2026","completed":false},{"step":"Submit onboarding documents","deadline":"Sep 20, 2026","completed":false},{"step":"First day orientation","deadline":"Oct 1, 2026","completed":false}]'::jsonb,
       '[{"tip":"Review our engineering blog for recent technical decisions","category":"Technical"},{"tip":"Familiarize yourself with our design system documentation","category":"Technical"},{"tip":"Prepare questions about team structure and sprint cadence","category":"Culture"},{"tip":"Review TypeScript best practices and React 18 patterns","category":"Technical"}]'::jsonb
      ),
      (offer_id_2, null, existing_candidate_id, existing_recruiter_id,
       'Staff Software Engineer', 'Vantara Systems', 'Platform Engineering',
       '$160,000 – $185,000 / year', 'November 1, 2026',
       'Congratulations on completing the interview process. We would love to have you lead our platform infrastructure initiatives.',
       'accepted',
       '[{"step":"Sign offer letter","deadline":"Sep 10, 2026","completed":true},{"step":"Complete background check","deadline":"Sep 14, 2026","completed":true},{"step":"Submit onboarding documents","deadline":"Sep 25, 2026","completed":false}]'::jsonb,
       '[]'::jsonb
      )
    ON CONFLICT (id) DO NOTHING;

    -- Recruiter availability slots (next 2 weeks)
    INSERT INTO public.recruiter_availability (id, recruiter_id, slot_date, start_time, end_time, duration_minutes, status)
    VALUES
      (slot_id_1, existing_recruiter_id, CURRENT_DATE + 2, '09:00', '09:45', 45, 'available'),
      (slot_id_2, existing_recruiter_id, CURRENT_DATE + 2, '11:00', '11:45', 45, 'available'),
      (slot_id_3, existing_recruiter_id, CURRENT_DATE + 3, '10:00', '10:45', 45, 'available'),
      (slot_id_4, existing_recruiter_id, CURRENT_DATE + 3, '14:00', '14:45', 45, 'booked'),
      (slot_id_5, existing_recruiter_id, CURRENT_DATE + 5, '09:30', '10:15', 45, 'available'),
      (slot_id_6, existing_recruiter_id, CURRENT_DATE + 7, '15:00', '15:45', 45, 'available')
    ON CONFLICT (id) DO NOTHING;
  ELSE
    RAISE NOTICE 'No recruiter or candidate found. Skipping mock data.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Mock data insertion failed: %', SQLERRM;
END $$;
