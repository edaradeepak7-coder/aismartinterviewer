-- ─── Billing & Credit Tracking Migration ─────────────────────────────────────
-- Tables: subscriptions, credit_usage, overage_invoices, payment_methods, billing_invoices

-- ─── 1. ENUMS ─────────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.subscription_status CASCADE;
CREATE TYPE public.subscription_status AS ENUM ('trialing', 'active', 'past_due', 'cancelled', 'paused', 'downgrading');

DROP TYPE IF EXISTS public.billing_cycle CASCADE;
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'annual');

DROP TYPE IF EXISTS public.invoice_status CASCADE;
CREATE TYPE public.invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');

DROP TYPE IF EXISTS public.invoice_type CASCADE;
CREATE TYPE public.invoice_type AS ENUM ('subscription', 'overage', 'topup', 'prorated_refund');

-- ─── 2. SUBSCRIPTIONS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  tenant_id UUID,
  plan_id TEXT NOT NULL DEFAULT 'free',
  plan_name TEXT NOT NULL DEFAULT 'Free',
  status public.subscription_status NOT NULL DEFAULT 'active',
  billing_cycle public.billing_cycle NOT NULL DEFAULT 'monthly',
  price_inr INTEGER NOT NULL DEFAULT 0,
  credits_total INTEGER NOT NULL DEFAULT 30,
  credits_remaining INTEGER NOT NULL DEFAULT 30,
  credits_used INTEGER NOT NULL DEFAULT 0,
  overage_rate_paise INTEGER NOT NULL DEFAULT 0,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  renewal_date TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  cancelled_at TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  data_retain_until TIMESTAMPTZ,
  downgrade_to_plan TEXT,
  downgrade_at TIMESTAMPTZ,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_subscription_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON public.subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);

-- ─── 3. CREDIT USAGE TABLE ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  tenant_id UUID,
  action_type TEXT NOT NULL,
  feature TEXT NOT NULL,
  credits_consumed INTEGER NOT NULL DEFAULT 0,
  credits_used INTEGER NOT NULL DEFAULT 0,
  is_overage BOOLEAN NOT NULL DEFAULT false,
  overage_amount_paise INTEGER NOT NULL DEFAULT 0,
  reference_id TEXT,
  reference_type TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_usage_user_id ON public.credit_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_subscription_id ON public.credit_usage(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_tenant_id ON public.credit_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_usage_created_at ON public.credit_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_usage_is_overage ON public.credit_usage(is_overage);

-- ─── 4. BILLING INVOICES TABLE ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  tenant_id UUID,
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_type public.invoice_type NOT NULL DEFAULT 'subscription',
  status public.invoice_status NOT NULL DEFAULT 'draft',
  amount_inr INTEGER NOT NULL DEFAULT 0,
  tax_amount_inr INTEGER NOT NULL DEFAULT 0,
  total_amount_inr INTEGER NOT NULL DEFAULT 0,
  credits_included INTEGER NOT NULL DEFAULT 0,
  overage_credits INTEGER NOT NULL DEFAULT 0,
  billing_period_start TIMESTAMPTZ,
  billing_period_end TIMESTAMPTZ,
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  line_items JSONB DEFAULT '[]',
  notes TEXT,
  download_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_invoices_user_id ON public.billing_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_subscription_id ON public.billing_invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_invoice_type ON public.billing_invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_created_at ON public.billing_invoices(created_at);

-- ─── 5. PAYMENT METHODS TABLE ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  method_type TEXT NOT NULL DEFAULT 'card',
  display_name TEXT NOT NULL,
  last_four TEXT,
  card_brand TEXT,
  expiry_month INTEGER,
  expiry_year INTEGER,
  upi_id TEXT,
  bank_name TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  razorpay_token_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id ON public.payment_methods(user_id);

-- ─── 6. OVERAGE ALERTS TABLE ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.overage_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  threshold_pct INTEGER NOT NULL DEFAULT 80,
  alert_sent_at TIMESTAMPTZ,
  alert_type TEXT NOT NULL DEFAULT 'email',
  credits_at_alert INTEGER,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_overage_alerts_user_id ON public.overage_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_overage_alerts_subscription_id ON public.overage_alerts(subscription_id);

-- ─── 7. CREDIT TOPUPS TABLE ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_topups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  tenant_id UUID,
  credits_added INTEGER NOT NULL DEFAULT 0,
  bonus_credits INTEGER NOT NULL DEFAULT 0,
  amount_paid_inr INTEGER NOT NULL DEFAULT 0,
  package_id TEXT,
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_topups_user_id ON public.credit_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_topups_subscription_id ON public.credit_topups(subscription_id);

-- ─── 8. FUNCTIONS ─────────────────────────────────────────────────────────────

-- Function: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_billing_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Function: generate invoice number
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num BIGINT;
  inv_num TEXT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 4) AS BIGINT)), 0) + 1
  INTO seq_num
  FROM public.billing_invoices;
  inv_num := 'INV' || LPAD(seq_num::TEXT, 6, '0');
  RETURN inv_num;
END;
$$;

-- Function: consume credits and detect overage
CREATE OR REPLACE FUNCTION public.consume_credits(
  p_user_id UUID,
  p_action_type TEXT,
  p_feature TEXT,
  p_credits INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_is_overage BOOLEAN := false;
  v_overage_amount INTEGER := 0;
  v_usage_id UUID;
  v_threshold_80 BOOLEAN := false;
  v_threshold_90 BOOLEAN := false;
  v_usage_pct INTEGER;
BEGIN
  -- Get active subscription
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription found');
  END IF;

  -- Check if overage
  IF v_sub.credits_remaining < p_credits THEN
    v_is_overage := true;
    v_overage_amount := (p_credits - GREATEST(v_sub.credits_remaining, 0)) * v_sub.overage_rate_paise;
  END IF;

  -- Insert usage record
  INSERT INTO public.credit_usage (
    user_id, subscription_id, tenant_id, action_type, feature,
    credits_consumed, credits_used, is_overage, overage_amount_paise,
    reference_id, reference_type
  ) VALUES (
    p_user_id, v_sub.id, v_sub.tenant_id, p_action_type, p_feature,
    p_credits, p_credits, v_is_overage, v_overage_amount,
    p_reference_id, p_reference_type
  ) RETURNING id INTO v_usage_id;

  -- Update subscription credits
  UPDATE public.subscriptions
  SET
    credits_remaining = GREATEST(credits_remaining - p_credits, 0),
    credits_used = credits_used + p_credits,
    updated_at = now()
  WHERE id = v_sub.id;

  -- Calculate usage percentage
  v_usage_pct := ROUND(((v_sub.credits_used + p_credits)::NUMERIC / v_sub.credits_total) * 100);

  -- Check thresholds for alerts
  IF v_usage_pct >= 80 AND v_usage_pct < 90 THEN
    v_threshold_80 := true;
  ELSIF v_usage_pct >= 90 THEN
    v_threshold_90 := true;
  END IF;

  -- Insert overage alert if needed
  IF v_threshold_80 OR v_threshold_90 THEN
    INSERT INTO public.overage_alerts (
      user_id, subscription_id, threshold_pct, credits_at_alert, alert_type
    )
    SELECT
      p_user_id, v_sub.id,
      CASE WHEN v_threshold_90 THEN 90 ELSE 80 END,
      v_sub.credits_remaining - p_credits,
      'email'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.overage_alerts
      WHERE user_id = p_user_id
        AND subscription_id = v_sub.id
        AND threshold_pct = CASE WHEN v_threshold_90 THEN 90 ELSE 80 END
        AND created_at > v_sub.current_period_start
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'credits_consumed', p_credits,
    'is_overage', v_is_overage,
    'overage_amount_paise', v_overage_amount,
    'credits_remaining', GREATEST(v_sub.credits_remaining - p_credits, 0),
    'usage_pct', v_usage_pct,
    'alert_80', v_threshold_80,
    'alert_90', v_threshold_90
  );
END;
$$;

-- Function: process renewal
CREATE OR REPLACE FUNCTION public.process_subscription_renewal(p_subscription_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_inv_num TEXT;
  v_inv_id UUID;
BEGIN
  SELECT * INTO v_sub FROM public.subscriptions WHERE id = p_subscription_id;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Subscription not found');
  END IF;

  -- If cancellation requested, mark cancelled
  IF v_sub.cancel_at_period_end THEN
    UPDATE public.subscriptions
    SET status = 'cancelled', cancelled_at = now(), data_retain_until = now() + INTERVAL '30 days', updated_at = now()
    WHERE id = p_subscription_id;
    RETURN jsonb_build_object('success', true, 'action', 'cancelled');
  END IF;

  -- If downgrade pending, apply it
  IF v_sub.downgrade_to_plan IS NOT NULL THEN
    UPDATE public.subscriptions
    SET
      plan_id = downgrade_to_plan,
      downgrade_to_plan = NULL,
      downgrade_at = NULL,
      updated_at = now()
    WHERE id = p_subscription_id;
  END IF;

  -- Reset credits for new period
  UPDATE public.subscriptions
  SET
    credits_remaining = credits_total,
    credits_used = 0,
    current_period_start = now(),
    current_period_end = now() + INTERVAL '1 month',
    renewal_date = now() + INTERVAL '1 month',
    updated_at = now()
  WHERE id = p_subscription_id;

  -- Generate renewal invoice
  v_inv_num := public.generate_invoice_number();
  INSERT INTO public.billing_invoices (
    user_id, subscription_id, tenant_id, invoice_number, invoice_type,
    status, amount_inr, total_amount_inr, credits_included,
    billing_period_start, billing_period_end, due_date
  ) VALUES (
    v_sub.user_id, p_subscription_id, v_sub.tenant_id, v_inv_num, 'subscription',
    'open', v_sub.price_inr, v_sub.price_inr, v_sub.credits_total,
    now(), now() + INTERVAL '1 month', now() + INTERVAL '7 days'
  ) RETURNING id INTO v_inv_id;

  RETURN jsonb_build_object('success', true, 'action', 'renewed', 'invoice_id', v_inv_id, 'invoice_number', v_inv_num);
END;
$$;

-- Function: process downgrade with pro-ration
CREATE OR REPLACE FUNCTION public.process_downgrade(
  p_user_id UUID,
  p_new_plan_id TEXT,
  p_new_plan_name TEXT,
  p_new_price INTEGER,
  p_new_credits INTEGER,
  p_new_overage_rate INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
  v_days_remaining INTEGER;
  v_days_total INTEGER;
  v_prorated_refund INTEGER;
  v_inv_num TEXT;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
  END IF;

  -- Calculate pro-rated refund
  v_days_total := EXTRACT(DAY FROM (v_sub.current_period_end - v_sub.current_period_start));
  v_days_remaining := GREATEST(0, EXTRACT(DAY FROM (v_sub.current_period_end - now()))::INTEGER);
  v_prorated_refund := ROUND((v_sub.price_inr::NUMERIC / GREATEST(v_days_total, 1)) * v_days_remaining);

  -- Apply downgrade immediately
  UPDATE public.subscriptions
  SET
    plan_id = p_new_plan_id,
    plan_name = p_new_plan_name,
    price_inr = p_new_price,
    credits_total = p_new_credits,
    credits_remaining = LEAST(credits_remaining, p_new_credits),
    overage_rate_paise = p_new_overage_rate,
    updated_at = now()
  WHERE id = v_sub.id;

  -- Generate prorated refund invoice if applicable
  IF v_prorated_refund > 0 THEN
    v_inv_num := public.generate_invoice_number();
    INSERT INTO public.billing_invoices (
      user_id, subscription_id, tenant_id, invoice_number, invoice_type,
      status, amount_inr, total_amount_inr, notes
    ) VALUES (
      p_user_id, v_sub.id, v_sub.tenant_id, v_inv_num, 'prorated_refund',
      'open', -v_prorated_refund, -v_prorated_refund,
      'Pro-rated credit for downgrade from ' || v_sub.plan_name || ' to ' || p_new_plan_name
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'prorated_refund_inr', v_prorated_refund,
    'new_plan', p_new_plan_name
  );
END;
$$;

-- Function: cancel subscription
CREATE OR REPLACE FUNCTION public.cancel_subscription(p_user_id UUID, p_immediate BOOLEAN DEFAULT false)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sub RECORD;
BEGIN
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  ORDER BY created_at DESC LIMIT 1;

  IF v_sub IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'No active subscription');
  END IF;

  IF p_immediate THEN
    UPDATE public.subscriptions
    SET
      status = 'cancelled',
      cancelled_at = now(),
      cancel_at_period_end = false,
      data_retain_until = now() + INTERVAL '30 days',
      updated_at = now()
    WHERE id = v_sub.id;
  ELSE
    UPDATE public.subscriptions
    SET
      cancel_at_period_end = true,
      cancelled_at = now(),
      updated_at = now()
    WHERE id = v_sub.id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'cancelled_immediately', p_immediate,
    'data_retain_until', (now() + INTERVAL '30 days')::TEXT
  );
END;
$$;

-- ─── 9. ENABLE RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overage_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_topups ENABLE ROW LEVEL SECURITY;

-- ─── 10. RLS POLICIES ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_manage_own_subscriptions" ON public.subscriptions;
CREATE POLICY "users_manage_own_subscriptions" ON public.subscriptions
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_view_own_credit_usage" ON public.credit_usage;
CREATE POLICY "users_view_own_credit_usage" ON public.credit_usage
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_insert_own_credit_usage" ON public.credit_usage;
CREATE POLICY "users_insert_own_credit_usage" ON public.credit_usage
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_billing_invoices" ON public.billing_invoices;
CREATE POLICY "users_manage_own_billing_invoices" ON public.billing_invoices
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_payment_methods" ON public.payment_methods;
CREATE POLICY "users_manage_own_payment_methods" ON public.payment_methods
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_view_own_overage_alerts" ON public.overage_alerts;
CREATE POLICY "users_view_own_overage_alerts" ON public.overage_alerts
FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_manage_own_credit_topups" ON public.credit_topups;
CREATE POLICY "users_manage_own_credit_topups" ON public.credit_topups
FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── 11. TRIGGERS ─────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();

DROP TRIGGER IF EXISTS trg_billing_invoices_updated_at ON public.billing_invoices;
CREATE TRIGGER trg_billing_invoices_updated_at
  BEFORE UPDATE ON public.billing_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();

DROP TRIGGER IF EXISTS trg_payment_methods_updated_at ON public.payment_methods;
CREATE TRIGGER trg_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_billing_updated_at();

-- ─── 12. SEED DEMO DATA ───────────────────────────────────────────────────────
DO $$
DECLARE
  v_user_id UUID;
  v_sub_id UUID;
  v_inv_num TEXT;
BEGIN
  SELECT id INTO v_user_id FROM public.user_profiles LIMIT 1;

  IF v_user_id IS NOT NULL THEN
    -- Create a demo active subscription
    INSERT INTO public.subscriptions (
      user_id, plan_id, plan_name, status, billing_cycle,
      price_inr, credits_total, credits_remaining, credits_used,
      overage_rate_paise, current_period_start, current_period_end, renewal_date
    ) VALUES (
      v_user_id, 'growth', 'Growth', 'active', 'monthly',
      1499, 350, 218, 132,
      400, date_trunc('month', now()), date_trunc('month', now()) + INTERVAL '1 month',
      date_trunc('month', now()) + INTERVAL '1 month'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_sub_id;

    IF v_sub_id IS NOT NULL THEN
      -- Seed some credit usage
      INSERT INTO public.credit_usage (user_id, subscription_id, action_type, feature, credits_consumed, credits_used, is_overage)
      VALUES
        (v_user_id, v_sub_id, 'interview_20min', 'AI Interview', 10, 10, false),
        (v_user_id, v_sub_id, 'interview_30min', 'AI Interview', 15, 15, false),
        (v_user_id, v_sub_id, 'voice_addon', 'Voice Interview', 5, 5, false),
        (v_user_id, v_sub_id, 'lsrw_session', 'LSRW Session', 8, 8, false),
        (v_user_id, v_sub_id, 'coding_assessment', 'Coding Assessment', 5, 5, false),
        (v_user_id, v_sub_id, 'resume_ats', 'Resume Check', 3, 3, false),
        (v_user_id, v_sub_id, 'ai_coaching', 'AI Coaching', 2, 2, false),
        (v_user_id, v_sub_id, 'interview_20min', 'AI Interview', 10, 10, false),
        (v_user_id, v_sub_id, 'interview_20min', 'AI Interview', 10, 10, false),
        (v_user_id, v_sub_id, 'interview_45min', 'AI Interview', 22, 22, false),
        (v_user_id, v_sub_id, 'resume_ats', 'Resume Check', 3, 3, false),
        (v_user_id, v_sub_id, 'ai_coaching', 'AI Coaching', 2, 2, false),
        (v_user_id, v_sub_id, 'ai_coaching', 'AI Coaching', 2, 2, false),
        (v_user_id, v_sub_id, 'lsrw_session', 'LSRW Session', 8, 8, false),
        (v_user_id, v_sub_id, 'coding_assessment', 'Coding Assessment', 5, 5, false)
      ON CONFLICT DO NOTHING;

      -- Seed invoices
      INSERT INTO public.billing_invoices (
        user_id, subscription_id, invoice_number, invoice_type, status,
        amount_inr, total_amount_inr, credits_included,
        billing_period_start, billing_period_end, paid_at
      ) VALUES
        (v_user_id, v_sub_id, 'INV000001', 'subscription', 'paid', 1499, 1499, 350,
         now() - INTERVAL '2 months', now() - INTERVAL '1 month', now() - INTERVAL '2 months'),
        (v_user_id, v_sub_id, 'INV000002', 'subscription', 'paid', 1499, 1499, 350,
         now() - INTERVAL '1 month', now(), now() - INTERVAL '1 month'),
        (v_user_id, v_sub_id, 'INV000003', 'subscription', 'open', 1499, 1499, 350,
         now(), now() + INTERVAL '1 month', NULL)
      ON CONFLICT (invoice_number) DO NOTHING;

      -- Seed a demo payment method
      INSERT INTO public.payment_methods (user_id, method_type, display_name, last_four, card_brand, expiry_month, expiry_year, is_default)
      VALUES (v_user_id, 'card', 'Visa ending in 4242', '4242', 'Visa', 12, 2027, true)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Seed data failed: %', SQLERRM;
END $$;
