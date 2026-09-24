-- ============================================================
-- RLS Audit Trail, Alert Thresholds & Diagnostic Tables
-- ============================================================

-- 1. RLS Violation / Security Audit Extension Table
CREATE TABLE IF NOT EXISTS public.rls_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'policy_violation' | 'unauthorized_access' | 'data_exposure_risk' | 'suspicious_query'
  user_id UUID,
  user_email TEXT,
  user_role TEXT,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- SELECT | INSERT | UPDATE | DELETE
  policy_name TEXT,
  resource_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  query_snippet TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium', -- 'low' | 'medium' | 'high' | 'critical'
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rls_audit_events_user_id ON public.rls_audit_events(user_id);
CREATE INDEX IF NOT EXISTS idx_rls_audit_events_event_type ON public.rls_audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rls_audit_events_risk_level ON public.rls_audit_events(risk_level);
CREATE INDEX IF NOT EXISTS idx_rls_audit_events_created_at ON public.rls_audit_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rls_audit_events_table_name ON public.rls_audit_events(table_name);

ALTER TABLE public.rls_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_rls_audit_events" ON public.rls_audit_events;
CREATE POLICY "admin_full_access_rls_audit_events"
ON public.rls_audit_events FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- 2. Alert Thresholds Table
CREATE TABLE IF NOT EXISTS public.alert_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'connectivity' | 'performance' | 'automation' | 'security'
  metric_key TEXT NOT NULL UNIQUE,
  warn_value NUMERIC NOT NULL,
  critical_value NUMERIC NOT NULL,
  unit TEXT NOT NULL DEFAULT 'ms', -- 'ms' | '%' | 'count' | 'per_min'
  enabled BOOLEAN NOT NULL DEFAULT true,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sms BOOLEAN NOT NULL DEFAULT false,
  email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  sms_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  cooldown_minutes INTEGER NOT NULL DEFAULT 15,
  last_triggered_at TIMESTAMPTZ,
  created_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_thresholds_category ON public.alert_thresholds(category);
CREATE INDEX IF NOT EXISTS idx_alert_thresholds_metric_key ON public.alert_thresholds(metric_key);

ALTER TABLE public.alert_thresholds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_alert_thresholds" ON public.alert_thresholds;
CREATE POLICY "admin_full_access_alert_thresholds"
ON public.alert_thresholds FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- 3. Alert Notifications Log
CREATE TABLE IF NOT EXISTS public.alert_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_id UUID REFERENCES public.alert_thresholds(id) ON DELETE SET NULL,
  threshold_name TEXT NOT NULL,
  metric_key TEXT NOT NULL,
  triggered_value NUMERIC NOT NULL,
  severity TEXT NOT NULL, -- 'warn' | 'critical'
  channel TEXT NOT NULL, -- 'email' | 'sms'
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed' | 'suppressed'
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_threshold_id ON public.alert_notifications(threshold_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_created_at ON public.alert_notifications(created_at DESC);

ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_alert_notifications" ON public.alert_notifications;
CREATE POLICY "admin_full_access_alert_notifications"
ON public.alert_notifications FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- 4. Diagnostic Sessions Table (for Super Admin tool)
CREATE TABLE IF NOT EXISTS public.diagnostic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL,
  target_user_id UUID,
  target_user_email TEXT,
  session_type TEXT NOT NULL DEFAULT 'inspect', -- 'inspect' | 'replay' | 'diagnose'
  notes TEXT,
  data_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ
);

ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_diagnostic_sessions" ON public.diagnostic_sessions;
CREATE POLICY "admin_full_access_diagnostic_sessions"
ON public.diagnostic_sessions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- 5. Seed default alert thresholds
DO $$
BEGIN
  INSERT INTO public.alert_thresholds (name, category, metric_key, warn_value, critical_value, unit, notify_email, notify_sms, email_recipients, cooldown_minutes)
  VALUES
    ('Supabase Auth Latency', 'connectivity', 'supabase_auth_latency_ms', 250, 500, 'ms', true, false, ARRAY['admin@triveda.ai']::TEXT[], 15),
    ('Supabase DB Latency', 'connectivity', 'supabase_db_latency_ms', 200, 400, 'ms', true, false, ARRAY['admin@triveda.ai']::TEXT[], 15),
    ('Resend Email Latency', 'connectivity', 'resend_latency_ms', 300, 2000, 'ms', true, false, ARRAY['admin@triveda.ai']::TEXT[], 30),
    ('OpenAI API Latency', 'connectivity', 'openai_latency_ms', 1000, 5000, 'ms', true, false, ARRAY['admin@triveda.ai']::TEXT[], 30),
    ('API Error Rate', 'performance', 'api_error_rate_pct', 5, 15, '%', true, true, ARRAY['admin@triveda.ai']::TEXT[], 10),
    ('DB Query P95 Latency', 'performance', 'db_query_p95_ms', 500, 2000, 'ms', true, false, ARRAY['admin@triveda.ai']::TEXT[], 20),
    ('Cache Hit Rate', 'performance', 'cache_hit_rate_pct', 70, 50, '%', true, false, ARRAY['admin@triveda.ai']::TEXT[], 60),
    ('Workflow Failure Rate', 'automation', 'workflow_failure_rate_pct', 10, 25, '%', true, true, ARRAY['admin@triveda.ai']::TEXT[], 15),
    ('Dead Letter Queue Depth', 'automation', 'dlq_depth_count', 10, 50, 'count', true, true, ARRAY['admin@triveda.ai']::TEXT[], 30),
    ('Failed Login Attempts', 'security', 'failed_login_per_min', 5, 20, 'per_min', true, true, ARRAY['admin@triveda.ai']::TEXT[], 5),
    ('RLS Violations', 'security', 'rls_violations_per_hour', 3, 10, 'count', true, true, ARRAY['admin@triveda.ai']::TEXT[], 10),
    ('Concurrent Sessions', 'performance', 'concurrent_sessions_count', 500, 1000, 'count', true, false, ARRAY['admin@triveda.ai']::TEXT[], 60)
  ON CONFLICT (metric_key) DO NOTHING;
END $$;
