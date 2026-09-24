-- ============================================================
-- Security Dashboard & SMS OTP Enhancement Migration
-- 20260906030000_security_dashboard_tables.sql
-- ============================================================

-- Add phone_number column to user_profiles for SMS OTP
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'phone_number'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN phone_number TEXT;
  END IF;
END $$;

-- Add sms_otp_enabled flag to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_profiles'
      AND column_name = 'sms_otp_enabled'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN sms_otp_enabled BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create blocked_ips table for persistent IP blocking
CREATE TABLE IF NOT EXISTS public.blocked_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reason TEXT NOT NULL,
  attempts INTEGER DEFAULT 1,
  blocked_by UUID REFERENCES public.user_profiles(id),
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_permanent BOOLEAN DEFAULT FALSE,
  country_code TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON public.blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires ON public.blocked_ips(expires_at);

-- RLS for blocked_ips: only admins can read/write
ALTER TABLE public.blocked_ips ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'blocked_ips' AND policyname = 'admins_manage_blocked_ips'
  ) THEN
    CREATE POLICY admins_manage_blocked_ips ON public.blocked_ips
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('super_admin', 'institution_admin', 'admin')
        )
      );
  END IF;
END $$;

-- Create security_events table for real-time threat tracking
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'blocked_ip', 'rate_limit_violation', 'suspicious_pattern',
    'brute_force', 'sql_injection', 'xss_attempt', 'path_traversal',
    'scanner_detected', 'unusual_access'
  )),
  ip_address TEXT,
  user_id UUID REFERENCES public.user_profiles(id),
  user_email TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description TEXT,
  details JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES public.user_profiles(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created ON public.security_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);

-- RLS for security_events: only admins can read
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events' AND policyname = 'admins_read_security_events'
  ) THEN
    CREATE POLICY admins_read_security_events ON public.security_events
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
            AND role IN ('super_admin', 'institution_admin', 'admin')
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'security_events' AND policyname = 'service_insert_security_events'
  ) THEN
    CREATE POLICY service_insert_security_events ON public.security_events
      FOR INSERT
      WITH CHECK (true);
  END IF;
END $$;

-- View: failed_logins_summary (last 24h, grouped by email)
CREATE OR REPLACE VIEW public.failed_logins_summary AS
SELECT
  user_email,
  user_role,
  COUNT(*) AS attempt_count,
  MAX(created_at) AS last_attempt,
  MAX(ip_address) AS last_ip,
  CASE WHEN COUNT(*) >= 10 THEN true ELSE false END AS is_locked
FROM public.audit_logs
WHERE
  action = 'login_failed'
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_email, user_role
ORDER BY attempt_count DESC;

-- View: hourly_threat_counts (last 24h)
CREATE OR REPLACE VIEW public.hourly_threat_counts AS
SELECT
  DATE_TRUNC('hour', created_at) AS hour_bucket,
  COUNT(*) AS event_count,
  COUNT(*) FILTER (WHERE outcome = 'failure') AS failure_count,
  COUNT(*) FILTER (WHERE outcome = 'blocked') AS blocked_count
FROM public.audit_logs
WHERE
  action IN ('login_failed', 'login_locked', 'suspicious_activity', 'mfa_failed')
  AND created_at >= NOW() - INTERVAL '24 hours'
GROUP BY hour_bucket
ORDER BY hour_bucket;
