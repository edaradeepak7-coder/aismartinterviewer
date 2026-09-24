-- Admin / ops surfaces: CRM, skills tree, email templates, reports, health probes, AI provider/usage

-- ─── Helper: admin role check via user_profiles ───────────────────────────────
-- Policies use EXISTS on user_profiles for consistency with requireAdmin.

-- ─── 1. Skills nodes ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.skills_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES public.skills_nodes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skills_nodes_parent ON public.skills_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_skills_nodes_sort ON public.skills_nodes(sort_order);

ALTER TABLE public.skills_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_skills_nodes" ON public.skills_nodes;
CREATE POLICY "admins_manage_skills_nodes"
ON public.skills_nodes FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- ─── 2. Email templates ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  body_html TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON public.email_templates(slug);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_email_templates" ON public.email_templates;
CREATE POLICY "admins_manage_email_templates"
ON public.email_templates FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

INSERT INTO public.email_templates (slug, name, subject, body_html)
VALUES
  ('enrollment', 'Course Enrollment', 'You''re enrolled in {{course_name}}!', '<p>Hi {{candidate_name}},</p><p>You''ve enrolled in <strong>{{course_name}}</strong>.</p>'),
  ('completion', 'Course Completion', 'You completed {{course_name}}', '<p>Hi {{candidate_name}},</p><p>You completed <strong>{{course_name}}</strong>.</p>'),
  ('achievement', 'Achievement Unlock', 'Achievement unlocked: {{achievement_name}}', '<p>Hi {{candidate_name}},</p><p>You unlocked <strong>{{achievement_name}}</strong>.</p>'),
  ('interview', 'Interview Scheduled', 'Interview scheduled: {{interview_type}}', '<p>Hi {{candidate_name}},</p><p>Your interview is scheduled for {{interview_date}}.</p>'),
  ('leaderboard', 'Leaderboard Milestone', 'You''re in the Top {{rank}}', '<p>Hi {{candidate_name}},</p><p>You reached rank #{{rank}}.</p>')
ON CONFLICT (slug) DO NOTHING;

-- ─── 3. CRM leads ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
  value NUMERIC NOT NULL DEFAULT 0,
  owner_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_leads_stage ON public.crm_leads(stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_owner ON public.crm_leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_created ON public.crm_leads(created_at DESC);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_crm_leads" ON public.crm_leads;
CREATE POLICY "admins_manage_crm_leads"
ON public.crm_leads FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- ─── 4. CRM tasks ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_tasks_lead ON public.crm_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_tasks_due ON public.crm_tasks(due_at);

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_crm_tasks" ON public.crm_tasks;
CREATE POLICY "admins_manage_crm_tasks"
ON public.crm_tasks FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- ─── 5. Report definitions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_definitions_created ON public.report_definitions(created_at DESC);

ALTER TABLE public.report_definitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_report_definitions" ON public.report_definitions;
CREATE POLICY "admins_manage_report_definitions"
ON public.report_definitions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- ─── 6. Health probe results ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.health_probe_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  probe_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ok'
    CHECK (status IN ('ok', 'warn', 'fail', 'skip')),
  latency_ms INTEGER,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_probe_results_key ON public.health_probe_results(probe_key);
CREATE INDEX IF NOT EXISTS idx_health_probe_results_created ON public.health_probe_results(created_at DESC);

ALTER TABLE public.health_probe_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_health_probe_results" ON public.health_probe_results;
CREATE POLICY "admins_manage_health_probe_results"
ON public.health_probe_results FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

-- ─── 7. AI provider configs ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_provider_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_ai_provider_configs" ON public.ai_provider_configs;
CREATE POLICY "admins_manage_ai_provider_configs"
ON public.ai_provider_configs FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

INSERT INTO public.ai_provider_configs (provider_key, display_name, enabled, config)
VALUES
  ('groq', 'Groq', true, '{"type":"LLM","role":"primary","model":"llama-3.3-70b"}'::jsonb),
  ('openai', 'OpenAI', true, '{"type":"LLM","role":"fallback","model":"gpt-4o"}'::jsonb),
  ('deepgram', 'Deepgram', true, '{"type":"STT","role":"primary","model":"nova-2"}'::jsonb),
  ('cartesia', 'Cartesia', true, '{"type":"TTS","role":"primary","model":"sonic-english"}'::jsonb)
ON CONFLICT (provider_key) DO NOTHING;

-- ─── 8. AI usage logs ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  provider TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  tokens_in INTEGER NOT NULL DEFAULT 0,
  tokens_out INTEGER NOT NULL DEFAULT 0,
  cost_usd NUMERIC(12, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user ON public.ai_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_created ON public.ai_usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_provider ON public.ai_usage_logs(provider);

ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_read_ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "admins_read_ai_usage_logs"
ON public.ai_usage_logs FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role IN ('admin', 'super_admin', 'org_admin', 'institution_admin')
  )
);

DROP POLICY IF EXISTS "admins_insert_ai_usage_logs" ON public.ai_usage_logs;
CREATE POLICY "admins_insert_ai_usage_logs"
ON public.ai_usage_logs FOR INSERT TO authenticated
WITH CHECK (true);
