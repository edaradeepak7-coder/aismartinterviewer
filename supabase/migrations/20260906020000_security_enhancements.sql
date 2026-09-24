-- Migration: Security enhancements
-- Adds: audit_logs table, MFA tracking columns, encryption metadata
-- Timestamp: 20260906020000

-- ─── 1. Audit Logs Table ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  user_email      TEXT,
  user_role       TEXT,
  action          TEXT NOT NULL,
  resource        TEXT,
  resource_id     UUID,
  ip_address      TEXT,
  user_agent      TEXT,
  outcome         TEXT NOT NULL DEFAULT 'success'
                    CHECK (outcome IN ('success', 'failure', 'blocked')),
  details         JSONB DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id     ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address  ON public.audit_logs(ip_address);
CREATE INDEX IF NOT EXISTS idx_audit_logs_outcome     ON public.audit_logs(outcome);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit logs; users can read their own
DROP POLICY IF EXISTS "admins_read_audit_logs" ON public.audit_logs;
CREATE POLICY "admins_read_audit_logs"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
        AND (
          au.raw_user_meta_data->>'role' IN ('super_admin', 'institution_admin', 'admin')
          OR au.raw_app_meta_data->>'role' IN ('super_admin', 'institution_admin', 'admin')
        )
    )
    OR user_id = auth.uid()
  );

-- Anyone authenticated can insert audit logs (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "authenticated_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "authenticated_insert_audit_logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Audit logs are immutable — no updates or deletes by regular users
DROP POLICY IF EXISTS "no_update_audit_logs" ON public.audit_logs;
CREATE POLICY "no_update_audit_logs"
  ON public.audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "no_delete_audit_logs" ON public.audit_logs;
CREATE POLICY "no_delete_audit_logs"
  ON public.audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ─── 2. MFA Tracking Columns on user_profiles ───────────────────────────────

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mfa_enrolled_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_login_ip     TEXT,
  ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until      TIMESTAMPTZ;

-- ─── 3. Encryption metadata column on candidates ────────────────────────────
-- Tracks which fields are encrypted for migration/key-rotation purposes

ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS pii_encrypted BOOLEAN DEFAULT false;

ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT false;

ALTER TABLE public.interview_results
  ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT false;

ALTER TABLE public.recruiter_feedback
  ADD COLUMN IF NOT EXISTS content_encrypted BOOLEAN DEFAULT false;

-- ─── 4. Helper function: is_admin_role ──────────────────────────────────────
-- Used by audit log policies and security checks

CREATE OR REPLACE FUNCTION public.is_admin_role()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' IN ('super_admin', 'institution_admin', 'admin')
        OR au.raw_app_meta_data->>'role' IN ('super_admin', 'institution_admin', 'admin')
      )
  )
$$;

-- ─── 5. Audit log API route (anon insert allowed for server-side logging) ────
-- Allow anon role to insert audit logs (server API routes use anon key)
DROP POLICY IF EXISTS "anon_insert_audit_logs" ON public.audit_logs;
CREATE POLICY "anon_insert_audit_logs"
  ON public.audit_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);
