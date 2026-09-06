-- Support Tickets & Payment Retry Logic Migration
-- Timestamp: 20260906210000

-- ─── Support Ticket Status & Priority Types ───────────────────────────────────
DROP TYPE IF EXISTS public.ticket_status CASCADE;
CREATE TYPE public.ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed', 'escalated');

DROP TYPE IF EXISTS public.ticket_priority CASCADE;
CREATE TYPE public.ticket_priority AS ENUM ('low', 'medium', 'high', 'critical');

DROP TYPE IF EXISTS public.ticket_category CASCADE;
CREATE TYPE public.ticket_category AS ENUM ('billing', 'technical', 'account', 'feature_request', 'payment', 'subscription', 'other');

-- ─── Support Tickets Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category public.ticket_category DEFAULT 'other'::public.ticket_category,
  priority public.ticket_priority DEFAULT 'medium'::public.ticket_priority,
  status public.ticket_status DEFAULT 'open'::public.ticket_status,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  first_response_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Support Ticket Comments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  is_staff_reply BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Payment Retry Log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_retry_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  original_order_id TEXT,
  retry_attempt INTEGER DEFAULT 1,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,
  status TEXT DEFAULT 'pending',
  fallback_method TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- ─── Credit Usage Peak Hours Enhancement ─────────────────────────────────────
ALTER TABLE public.credit_usage
ADD COLUMN IF NOT EXISTS hour_of_day INTEGER,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS month_year TEXT;

-- ─── Subscription Email Alerts Log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_email_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_id ON public.support_ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_user_id ON public.payment_retry_log(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_retry_log_status ON public.payment_retry_log(status);
CREATE INDEX IF NOT EXISTS idx_credit_usage_hour ON public.credit_usage(hour_of_day);
CREATE INDEX IF NOT EXISTS idx_credit_usage_month_year ON public.credit_usage(month_year);
CREATE INDEX IF NOT EXISTS idx_subscription_email_alerts_user ON public.subscription_email_alerts(user_id);

-- ─── Ticket Number Generator ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 4) AS INTEGER)), 0) + 1
  INTO seq_num
  FROM public.support_tickets;
  RETURN 'TKT' || LPAD(seq_num::TEXT, 6, '0');
END;
$$;

-- ─── Updated At Trigger ───────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.update_support_ticket_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_support_ticket_updated_at();

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_retry_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_email_alerts ENABLE ROW LEVEL SECURITY;

-- Support tickets: users can manage their own, admins can see all
DROP POLICY IF EXISTS "users_manage_own_tickets" ON public.support_tickets;
CREATE POLICY "users_manage_own_tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (user_id = auth.uid() OR assigned_to = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_all_tickets" ON public.support_tickets;
CREATE POLICY "admin_manage_all_tickets"
ON public.support_tickets FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'recruiter'))
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' IN ('admin', 'super_admin', 'recruiter'))
  )
);

-- Ticket comments
DROP POLICY IF EXISTS "users_manage_ticket_comments" ON public.support_ticket_comments;
CREATE POLICY "users_manage_ticket_comments"
ON public.support_ticket_comments FOR ALL TO authenticated
USING (
  author_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND (st.user_id = auth.uid() OR st.assigned_to = auth.uid())
  )
)
WITH CHECK (author_id = auth.uid());

-- Payment retry log: own records only
DROP POLICY IF EXISTS "users_view_own_retry_log" ON public.payment_retry_log;
CREATE POLICY "users_view_own_retry_log"
ON public.payment_retry_log FOR SELECT TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_manage_retry_log" ON public.payment_retry_log;
CREATE POLICY "admin_manage_retry_log"
ON public.payment_retry_log FOR ALL TO authenticated
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

-- Email alerts: own records
DROP POLICY IF EXISTS "users_view_own_email_alerts" ON public.subscription_email_alerts;
CREATE POLICY "users_view_own_email_alerts"
ON public.subscription_email_alerts FOR SELECT TO authenticated
USING (user_id = auth.uid());
