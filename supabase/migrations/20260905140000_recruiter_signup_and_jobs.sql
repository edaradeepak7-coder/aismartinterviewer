-- Migration: Add company_name to user_profiles + RLS policies for jobs/bookings
-- Timestamp: 20260905140000

-- 1. Add company_name column to user_profiles (idempotent)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS company_name TEXT DEFAULT '';

-- 2. Allow candidates to read active job_postings
DROP POLICY IF EXISTS "candidates_read_active_job_postings" ON public.job_postings;
CREATE POLICY "candidates_read_active_job_postings"
ON public.job_postings
FOR SELECT
TO authenticated
USING (is_active = true);

-- 3. Allow recruiters/admins to manage their own job_postings
DROP POLICY IF EXISTS "recruiters_manage_own_job_postings" ON public.job_postings;
CREATE POLICY "recruiters_manage_own_job_postings"
ON public.job_postings
FOR ALL
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- 4. Allow authenticated users to read available recruiter slots
DROP POLICY IF EXISTS "candidates_read_available_slots" ON public.recruiter_availability;
CREATE POLICY "candidates_read_available_slots"
ON public.recruiter_availability
FOR SELECT
TO authenticated
USING (status = 'available');

-- 5. Allow candidates to insert interview_bookings
DROP POLICY IF EXISTS "candidates_create_bookings" ON public.interview_bookings;
CREATE POLICY "candidates_create_bookings"
ON public.interview_bookings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 6. Allow candidates to read their own bookings
DROP POLICY IF EXISTS "candidates_read_own_bookings" ON public.interview_bookings;
CREATE POLICY "candidates_read_own_bookings"
ON public.interview_bookings
FOR SELECT
TO authenticated
USING (
  candidate_id IN (
    SELECT id FROM public.candidates WHERE user_id = auth.uid()
  )
);

-- 7. Allow candidates to insert interviews when booking
DROP POLICY IF EXISTS "candidates_create_interviews" ON public.interviews;
CREATE POLICY "candidates_create_interviews"
ON public.interviews
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 8. Allow candidates to read their own interviews
DROP POLICY IF EXISTS "candidates_read_own_interviews" ON public.interviews;
CREATE POLICY "candidates_read_own_interviews"
ON public.interviews
FOR SELECT
TO authenticated
USING (
  candidate_id IN (
    SELECT id FROM public.candidates WHERE user_id = auth.uid()
  )
);

-- 9. Allow slot status update when booking
DROP POLICY IF EXISTS "candidates_update_slot_status" ON public.recruiter_availability;
CREATE POLICY "candidates_update_slot_status"
ON public.recruiter_availability
FOR UPDATE
TO authenticated
USING (status = 'available')
WITH CHECK (status = 'booked');
