-- ============================================================
-- API Keys Management + IP Whitelist tables
-- ============================================================

-- api_keys: stores encrypted API keys for AI providers
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'gemini', 'perplexity', 'groq')),
  label TEXT NOT NULL DEFAULT 'Production',
  masked_key TEXT NOT NULL,
  encrypted_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'rotating')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_rotated_at TIMESTAMPTZ,
  rotated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT
);

-- api_key_audit_trail: immutable log of all key operations
CREATE TABLE IF NOT EXISTS public.api_key_audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.api_keys(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('created', 'rotated', 'revoked', 'viewed', 'validated')),
  performed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_email TEXT,
  performed_by_role TEXT,
  ip_address TEXT,
  user_agent TEXT,
  outcome TEXT NOT NULL DEFAULT 'success' CHECK (outcome IN ('success', 'failure')),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ip_whitelist: allowed IPs for super_admin and institution_admin logins
CREATE TABLE IF NOT EXISTS public.ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  cidr_notation TEXT,
  label TEXT NOT NULL DEFAULT '',
  applies_to TEXT[] NOT NULL DEFAULT ARRAY['super_admin', 'institution_admin'],
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email TEXT,
  expires_at TIMESTAMPTZ,
  notes TEXT
);

-- ip_whitelist_events: security event log for blocked/allowed access
CREATE TABLE IF NOT EXISTS public.ip_whitelist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  user_email TEXT,
  user_role TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('blocked', 'allowed', 'whitelist_added', 'whitelist_removed', 'whitelist_updated')),
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_whitelist_events ENABLE ROW LEVEL SECURITY;

-- Only super_admin can manage API keys
CREATE POLICY "super_admin_api_keys" ON public.api_keys
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Audit trail: super_admin can read; system can insert (via service role)
CREATE POLICY "super_admin_read_audit_trail" ON public.api_key_audit_trail
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "insert_audit_trail" ON public.api_key_audit_trail
  FOR INSERT WITH CHECK (true);

-- IP whitelist: super_admin full access
CREATE POLICY "super_admin_ip_whitelist" ON public.ip_whitelist
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- IP whitelist events: super_admin read; system insert
CREATE POLICY "super_admin_read_ip_events" ON public.ip_whitelist_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "insert_ip_events" ON public.ip_whitelist_events
  FOR INSERT WITH CHECK (true);

-- Seed initial API key records (masked, no real keys stored here)
INSERT INTO public.api_keys (provider, label, masked_key, status, created_at)
VALUES
  ('openai', 'Production', 'sk-••••••••••••••••••••4d1e', 'active', NOW()),
  ('anthropic', 'Production', 'sk-ant-••••••••••••••••5e7b', 'active', NOW()),
  ('gemini', 'Production', 'AIza••••••••••••••••••••3f9a', 'active', NOW()),
  ('perplexity', 'Production', 'pplx-••••••••••••••••••••7b2c', 'active', NOW()),
  ('groq', 'Production', 'gsk_••••••••••••••••••••8a3f', 'active', NOW())
ON CONFLICT DO NOTHING;
