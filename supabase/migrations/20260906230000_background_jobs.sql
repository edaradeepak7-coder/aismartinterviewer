-- Background Jobs Queue Migration
-- Timestamp: 20260906230000
-- Enables reliable long-running task execution without API route timeouts

-- ─── Job Status & Type Enums ──────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE public.bg_job_status AS ENUM ('pending', 'running', 'completed', 'failed', 'cancelled', 'retrying');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.bg_job_type AS ENUM (
    'ai_evaluation',
    'bulk_export',
    'report_generation',
    'renewal_reminder',
    'overage_check',
    'payment_retry'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Background Jobs Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.bg_job_type NOT NULL,
  status public.bg_job_status DEFAULT 'pending'::public.bg_job_status,
  payload JSONB DEFAULT '{}'::jsonb,
  result JSONB DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  priority INTEGER DEFAULT 5,           -- 1 (highest) to 10 (lowest)
  scheduled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMPTZ DEFAULT NULL,
  completed_at TIMESTAMPTZ DEFAULT NULL,
  next_retry_at TIMESTAMPTZ DEFAULT NULL,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Job Execution Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_execution_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.background_jobs(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL DEFAULT 1,
  status public.bg_job_status NOT NULL,
  started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMPTZ DEFAULT NULL,
  duration_ms INTEGER DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  log_output TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status ON public.background_jobs(status);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_type ON public.background_jobs(type);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_tenant_id ON public.background_jobs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_created_by ON public.background_jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_scheduled_at ON public.background_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_bg_jobs_status_scheduled ON public.background_jobs(status, scheduled_at)
  WHERE status IN ('pending', 'retrying');
CREATE INDEX IF NOT EXISTS idx_job_exec_log_job_id ON public.job_execution_log(job_id);

-- ─── Updated At Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_bg_job_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bg_jobs_updated_at ON public.background_jobs;
CREATE TRIGGER trg_bg_jobs_updated_at
  BEFORE UPDATE ON public.background_jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_bg_job_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_execution_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own jobs; admins can see all
DROP POLICY IF EXISTS "users_view_own_jobs" ON public.background_jobs;
CREATE POLICY "users_view_own_jobs"
ON public.background_jobs FOR SELECT TO authenticated
USING (
  created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
  )
);

DROP POLICY IF EXISTS "users_insert_own_jobs" ON public.background_jobs;
CREATE POLICY "users_insert_own_jobs"
ON public.background_jobs FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "admin_manage_all_jobs" ON public.background_jobs;
CREATE POLICY "admin_manage_all_jobs"
ON public.background_jobs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
  )
);

-- Execution log: readable by job owner and admins
DROP POLICY IF EXISTS "users_view_own_exec_log" ON public.job_execution_log;
CREATE POLICY "users_view_own_exec_log"
ON public.job_execution_log FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.background_jobs bj
    WHERE bj.id = job_id
    AND (
      bj.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid()
        AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin'))
      )
    )
  )
);
