-- ─── Credit Adjustments & Subscription Pause ────────────────────────────────
-- Migration: 20260906220000_credit_adjustments_subscription_pause.sql

-- ─── Types ───────────────────────────────────────────────────────────────────
DROP TYPE IF EXISTS public.credit_adjustment_type CASCADE;
CREATE TYPE public.credit_adjustment_type AS ENUM ('grant', 'revoke', 'adjust');

DROP TYPE IF EXISTS public.credit_adjustment_status CASCADE;
CREATE TYPE public.credit_adjustment_status AS ENUM ('pending', 'applied', 'failed', 'rolled_back');

DROP TYPE IF EXISTS public.pause_status CASCADE;
CREATE TYPE public.pause_status AS ENUM ('active', 'resumed', 'expired', 'cancelled');

-- ─── Credit Adjustment Batches ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_adjustment_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by        UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  batch_name        TEXT NOT NULL,
  adjustment_type   public.credit_adjustment_type NOT NULL,
  reason            TEXT NOT NULL,
  promotion_code    TEXT,
  total_subscriptions INT DEFAULT 0,
  applied_count     INT DEFAULT 0,
  failed_count      INT DEFAULT 0,
  csv_filename      TEXT,
  csv_row_count     INT,
  status            public.credit_adjustment_status DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  applied_at        TIMESTAMPTZ
);

-- ─── Credit Adjustment Line Items ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.credit_adjustments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID REFERENCES public.credit_adjustment_batches(id) ON DELETE CASCADE,
  subscription_id   UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  user_email        TEXT NOT NULL,
  adjustment_type   public.credit_adjustment_type NOT NULL,
  credits_delta     INT NOT NULL,
  credits_before    INT,
  credits_after     INT,
  reason            TEXT NOT NULL,
  status            public.credit_adjustment_status DEFAULT 'pending',
  error_message     TEXT,
  applied_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── Subscription Pauses ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_pauses (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id   UUID REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  user_id           UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  pause_reason      TEXT,
  pause_months      INT NOT NULL CHECK (pause_months BETWEEN 1 AND 3),
  paused_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  resume_at         TIMESTAMPTZ NOT NULL,
  resumed_at        TIMESTAMPTZ,
  status            public.pause_status DEFAULT 'active',
  initiated_by      TEXT DEFAULT 'user' CHECK (initiated_by IN ('user', 'admin')),
  admin_note        TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_credit_adj_batches_created_by ON public.credit_adjustment_batches(created_by);
CREATE INDEX IF NOT EXISTS idx_credit_adj_batches_status ON public.credit_adjustment_batches(status);
CREATE INDEX IF NOT EXISTS idx_credit_adj_batches_created_at ON public.credit_adjustment_batches(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_credit_adjustments_batch_id ON public.credit_adjustments(batch_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_user_id ON public.credit_adjustments(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_subscription_id ON public.credit_adjustments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_credit_adjustments_status ON public.credit_adjustments(status);

CREATE INDEX IF NOT EXISTS idx_subscription_pauses_subscription_id ON public.subscription_pauses(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_pauses_user_id ON public.subscription_pauses(user_id);
CREATE INDEX IF NOT EXISTS idx_subscription_pauses_status ON public.subscription_pauses(status);
CREATE INDEX IF NOT EXISTS idx_subscription_pauses_resume_at ON public.subscription_pauses(resume_at);

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.credit_adjustment_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_pauses ENABLE ROW LEVEL SECURITY;

-- Admin-only for credit adjustment batches
DROP POLICY IF EXISTS "admin_manage_credit_adjustment_batches" ON public.credit_adjustment_batches;
CREATE POLICY "admin_manage_credit_adjustment_batches"
ON public.credit_adjustment_batches FOR ALL TO authenticated
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

-- Admin-only for credit adjustments
DROP POLICY IF EXISTS "admin_manage_credit_adjustments" ON public.credit_adjustments;
CREATE POLICY "admin_manage_credit_adjustments"
ON public.credit_adjustments FOR ALL TO authenticated
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

-- Users can view/manage their own pauses; admins can see all
DROP POLICY IF EXISTS "users_manage_own_subscription_pauses" ON public.subscription_pauses;
CREATE POLICY "users_manage_own_subscription_pauses"
ON public.subscription_pauses FOR ALL TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);
