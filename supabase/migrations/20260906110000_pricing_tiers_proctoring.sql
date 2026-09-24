-- Migration: pricing_tiers and proctoring_events
-- Timestamp: 20260906110000

-- ─── Pricing Tiers ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  cost_per_seat INTEGER NOT NULL DEFAULT 0,
  seat_minimum INTEGER NOT NULL DEFAULT 1,
  seat_maximum INTEGER,
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  tier_order INTEGER NOT NULL DEFAULT 1,
  badge_label TEXT NOT NULL DEFAULT '',
  cta_label TEXT NOT NULL DEFAULT 'Get Started',
  target_audience TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pricing_tiers_order ON public.pricing_tiers(tier_order);
CREATE INDEX IF NOT EXISTS idx_pricing_tiers_published ON public.pricing_tiers(is_published);

ALTER TABLE public.pricing_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_tiers_public_read" ON public.pricing_tiers;
CREATE POLICY "pricing_tiers_public_read"
  ON public.pricing_tiers
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "pricing_tiers_admin_write" ON public.pricing_tiers;
CREATE POLICY "pricing_tiers_admin_write"
  ON public.pricing_tiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND (au.raw_user_meta_data->>'role' = 'super_admin'
           OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND (au.raw_user_meta_data->>'role' = 'super_admin'
           OR au.raw_app_meta_data->>'role' = 'super_admin')
    )
  );

-- ─── Proctoring Events ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proctoring_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  interview_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'low',
  detail TEXT NOT NULL DEFAULT '',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proctoring_events_session ON public.proctoring_events(session_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_user ON public.proctoring_events(user_id);
CREATE INDEX IF NOT EXISTS idx_proctoring_events_type ON public.proctoring_events(event_type);

ALTER TABLE public.proctoring_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proctoring_events_user_insert" ON public.proctoring_events;
CREATE POLICY "proctoring_events_user_insert"
  ON public.proctoring_events
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "proctoring_events_user_read_own" ON public.proctoring_events;
CREATE POLICY "proctoring_events_user_read_own"
  ON public.proctoring_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "proctoring_events_admin_read" ON public.proctoring_events;
CREATE POLICY "proctoring_events_admin_read"
  ON public.proctoring_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users au
      WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' IN ('super_admin', 'recruiter', 'institution_admin')
        OR au.raw_app_meta_data->>'role' IN ('super_admin', 'recruiter', 'institution_admin')
      )
    )
  );

-- ─── Seed default pricing tiers ───────────────────────────────────────────────
INSERT INTO public.pricing_tiers (id, name, description, cost_per_seat, seat_minimum, seat_maximum, billing_period, features, is_published, is_popular, tier_order, badge_label, cta_label, target_audience)
VALUES
  (
    'starter',
    'Starter',
    'AI-powered interview prep for individual candidates',
    499,
    1,
    1,
    'monthly',
    '[
      {"id":"f1","text":"20 AI mock interviews/month","included":true},
      {"id":"f2","text":"Communication + Clarity + Domain scores","included":true},
      {"id":"f3","text":"Resume ATS check (5/month)","included":true},
      {"id":"f4","text":"Answer improvement suggestions","included":true},
      {"id":"f5","text":"Email support","included":true},
      {"id":"f6","text":"Company-specific prep packs","included":false},
      {"id":"f7","text":"Live recruiter interview access","included":false}
    ]'::jsonb,
    true,
    false,
    1,
    '',
    'Get Started',
    'Individual candidates'
  ),
  (
    'growth',
    'Growth',
    'Unlimited practice with advanced analytics and coaching',
    999,
    1,
    NULL,
    'monthly',
    '[
      {"id":"f1","text":"Unlimited AI mock interviews","included":true},
      {"id":"f2","text":"Full per-answer AI coaching","included":true},
      {"id":"f3","text":"Model answer library access","included":true},
      {"id":"f4","text":"Company-specific prep packs","included":true},
      {"id":"f5","text":"Resume ATS check (unlimited)","included":true},
      {"id":"f6","text":"Progress analytics dashboard","included":true},
      {"id":"f7","text":"Priority support","included":true}
    ]'::jsonb,
    true,
    true,
    2,
    'Most Popular',
    'Start Free Trial',
    'Serious candidates and small teams'
  ),
  (
    'enterprise',
    'Enterprise',
    'Institution-scale hiring and placement platform',
    299,
    50,
    NULL,
    'monthly',
    '[
      {"id":"f1","text":"Everything in Growth","included":true},
      {"id":"f2","text":"Bulk candidate import","included":true},
      {"id":"f3","text":"Placement drive management","included":true},
      {"id":"f4","text":"Dedicated success manager","included":true},
      {"id":"f5","text":"Custom interview scenarios","included":true},
      {"id":"f6","text":"Certificate of completion","included":true},
      {"id":"f7","text":"SLA 99.9% uptime guarantee","included":true}
    ]'::jsonb,
    true,
    false,
    3,
    'Best Value',
    'Contact Sales',
    'Institutions and large organizations'
  )
ON CONFLICT (id) DO NOTHING;
