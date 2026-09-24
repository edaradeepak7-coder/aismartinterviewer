-- Placement drives + enrollments (campus hiring MVP)

CREATE TABLE IF NOT EXISTS public.placement_drives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  job_posting_id UUID REFERENCES public.job_postings(id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  role_title TEXT NOT NULL DEFAULT '',
  location TEXT,
  package_lpa_min NUMERIC(8,2),
  package_lpa_max NUMERIC(8,2),
  drive_date DATE,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
  selected_count INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_placement_drives_status ON public.placement_drives(status);
CREATE INDEX IF NOT EXISTS idx_placement_drives_created_by ON public.placement_drives(created_by);
CREATE INDEX IF NOT EXISTS idx_placement_drives_drive_date ON public.placement_drives(drive_date);

CREATE TABLE IF NOT EXISTS public.placement_drive_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drive_id UUID NOT NULL REFERENCES public.placement_drives(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  institution_candidate_id UUID REFERENCES public.institution_candidates(id) ON DELETE SET NULL,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE SET NULL,
  candidate_name TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'registered'
    CHECK (stage IN ('registered', 'shortlisted', 'interviewing', 'selected', 'rejected', 'offered')),
  package_lpa NUMERIC(8,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (drive_id, candidate_id)
);

CREATE INDEX IF NOT EXISTS idx_pdc_drive ON public.placement_drive_candidates(drive_id);
CREATE INDEX IF NOT EXISTS idx_pdc_stage ON public.placement_drive_candidates(stage);
CREATE INDEX IF NOT EXISTS idx_pdc_candidate ON public.placement_drive_candidates(candidate_id);

CREATE OR REPLACE FUNCTION public.set_placement_drives_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_placement_drives_updated_at ON public.placement_drives;
CREATE TRIGGER trg_placement_drives_updated_at
  BEFORE UPDATE ON public.placement_drives
  FOR EACH ROW EXECUTE FUNCTION public.set_placement_drives_updated_at();

DROP TRIGGER IF EXISTS trg_pdc_updated_at ON public.placement_drive_candidates;
CREATE TRIGGER trg_pdc_updated_at
  BEFORE UPDATE ON public.placement_drive_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_placement_drives_updated_at();

-- Keep selected_count in sync when stage changes to/from selected|offered
CREATE OR REPLACE FUNCTION public.sync_placement_drive_selected_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  did UUID;
BEGIN
  did := COALESCE(NEW.drive_id, OLD.drive_id);
  UPDATE public.placement_drives
  SET selected_count = (
    SELECT COUNT(*)::INTEGER FROM public.placement_drive_candidates
    WHERE drive_id = did AND stage IN ('selected', 'offered')
  ),
  updated_at = NOW()
  WHERE id = did;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_pdc_sync_selected ON public.placement_drive_candidates;
CREATE TRIGGER trg_pdc_sync_selected
  AFTER INSERT OR UPDATE OF stage OR DELETE ON public.placement_drive_candidates
  FOR EACH ROW EXECUTE FUNCTION public.sync_placement_drive_selected_count();

ALTER TABLE public.placement_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.placement_drive_candidates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'placement_drives' AND policyname = 'placement_drives_staff'
  ) THEN
    CREATE POLICY placement_drives_staff ON public.placement_drives
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'placement_drive_candidates' AND policyname = 'placement_drive_candidates_staff'
  ) THEN
    CREATE POLICY placement_drive_candidates_staff ON public.placement_drive_candidates
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('admin', 'super_admin', 'org_admin', 'recruiter', 'institution_admin', 'faculty')
        )
      );
  END IF;
END $$;
