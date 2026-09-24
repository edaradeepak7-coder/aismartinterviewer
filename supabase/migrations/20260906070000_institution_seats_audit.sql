-- ─── Institution Seat Management & Question Bank Audit ───────────────────────
-- Migration: 20260906070000_institution_seats_audit.sql

-- ─── 1. Institution Registrations ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  contact_person TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  website TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'suspended', 'rejected')),
  total_seats INTEGER NOT NULL DEFAULT 0,
  used_seats INTEGER NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'Institution Basic',
  approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);
CREATE INDEX IF NOT EXISTS idx_institutions_email ON public.institutions(email);

-- ─── 2. Institution Candidates ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.institution_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  program TEXT NOT NULL DEFAULT '',
  year TEXT NOT NULL DEFAULT '',
  course TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  roll_number TEXT,
  seat_issued BOOLEAN NOT NULL DEFAULT false,
  seat_issued_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('active', 'inactive', 'placed', 'interviewing', 'suspended')),
  score INTEGER,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_inst_candidates_institution ON public.institution_candidates(institution_id);
CREATE INDEX IF NOT EXISTS idx_inst_candidates_program ON public.institution_candidates(program);
CREATE INDEX IF NOT EXISTS idx_inst_candidates_branch ON public.institution_candidates(branch);
CREATE INDEX IF NOT EXISTS idx_inst_candidates_year ON public.institution_candidates(year);
CREATE INDEX IF NOT EXISTS idx_inst_candidates_section ON public.institution_candidates(section);
CREATE UNIQUE INDEX IF NOT EXISTS idx_inst_candidates_email_inst ON public.institution_candidates(institution_id, email);

-- ─── 3. Seat Transactions ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.seat_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  seats_requested INTEGER NOT NULL CHECK (seats_requested > 0),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
  payment_method TEXT NOT NULL DEFAULT 'online'
    CHECK (payment_method IN ('online', 'offline')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'failed', 'pending_verification', 'rejected')),
  razorpay_order_id TEXT,
  razorpay_payment_id TEXT,
  razorpay_signature TEXT,
  offline_reference TEXT,
  verified_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seat_txn_institution ON public.seat_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_seat_txn_status ON public.seat_transactions(status);

-- ─── 4. Question Bank Audit Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.question_bank_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL
    CHECK (action IN ('create', 'edit', 'delete', 'bulk_import', 'bulk_delete', 'status_change', 'view')),
  table_key TEXT NOT NULL
    CHECK (table_key IN ('technical', 'hr', 'managerial')),
  record_id TEXT NOT NULL DEFAULT '',
  question_preview TEXT NOT NULL DEFAULT '',
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  user_email TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  user_role TEXT NOT NULL DEFAULT 'admin',
  change_details JSONB NOT NULL DEFAULT '{}',
  outcome TEXT NOT NULL DEFAULT 'success'
    CHECK (outcome IN ('success', 'failure')),
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qb_audit_action ON public.question_bank_audit(action);
CREATE INDEX IF NOT EXISTS idx_qb_audit_table_key ON public.question_bank_audit(table_key);
CREATE INDEX IF NOT EXISTS idx_qb_audit_user_id ON public.question_bank_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_qb_audit_created_at ON public.question_bank_audit(created_at DESC);

-- ─── 5. Enable RLS ────────────────────────────────────────────────────────────
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seat_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_bank_audit ENABLE ROW LEVEL SECURITY;

-- ─── 6. Helper Functions ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = auth.uid()
  AND (
    au.raw_user_meta_data->>'role' = 'super_admin'
    OR au.raw_user_meta_data->>'role' = 'admin'
    OR au.raw_app_meta_data->>'role' = 'admin'
  )
)
$$;

-- ─── 7. RLS Policies ─────────────────────────────────────────────────────────

-- institutions: super admin full access
DROP POLICY IF EXISTS "super_admin_manage_institutions" ON public.institutions;
CREATE POLICY "super_admin_manage_institutions"
ON public.institutions FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- institutions: institution admin can view own
DROP POLICY IF EXISTS "inst_admin_view_own_institution" ON public.institutions;
CREATE POLICY "inst_admin_view_own_institution"
ON public.institutions FOR SELECT TO authenticated
USING (email = (SELECT email FROM public.user_profiles WHERE id = auth.uid() LIMIT 1));

-- institution_candidates: super admin full access
DROP POLICY IF EXISTS "super_admin_manage_inst_candidates" ON public.institution_candidates;
CREATE POLICY "super_admin_manage_inst_candidates"
ON public.institution_candidates FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- institution_candidates: institution admin manages own institution's candidates
DROP POLICY IF EXISTS "inst_admin_manage_own_candidates" ON public.institution_candidates;
CREATE POLICY "inst_admin_manage_own_candidates"
ON public.institution_candidates FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT id FROM public.institutions
    WHERE email = (SELECT email FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
)
WITH CHECK (
  institution_id IN (
    SELECT id FROM public.institutions
    WHERE email = (SELECT email FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- seat_transactions: super admin full access
DROP POLICY IF EXISTS "super_admin_manage_seat_txn" ON public.seat_transactions;
CREATE POLICY "super_admin_manage_seat_txn"
ON public.seat_transactions FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- seat_transactions: institution admin manages own
DROP POLICY IF EXISTS "inst_admin_manage_own_seat_txn" ON public.seat_transactions;
CREATE POLICY "inst_admin_manage_own_seat_txn"
ON public.seat_transactions FOR ALL TO authenticated
USING (
  institution_id IN (
    SELECT id FROM public.institutions
    WHERE email = (SELECT email FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
)
WITH CHECK (
  institution_id IN (
    SELECT id FROM public.institutions
    WHERE email = (SELECT email FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- question_bank_audit: super admin full access
DROP POLICY IF EXISTS "super_admin_manage_qb_audit" ON public.question_bank_audit;
CREATE POLICY "super_admin_manage_qb_audit"
ON public.question_bank_audit FOR ALL TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- question_bank_audit: admins can insert (log their own actions)
DROP POLICY IF EXISTS "admins_insert_qb_audit" ON public.question_bank_audit;
CREATE POLICY "admins_insert_qb_audit"
ON public.question_bank_audit FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- ─── 8. Updated_at Trigger ────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_institutions_updated_at ON public.institutions;
CREATE TRIGGER set_institutions_updated_at
  BEFORE UPDATE ON public.institutions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_inst_candidates_updated_at ON public.institution_candidates;
CREATE TRIGGER set_inst_candidates_updated_at
  BEFORE UPDATE ON public.institution_candidates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_seat_txn_updated_at ON public.seat_transactions;
CREATE TRIGGER set_seat_txn_updated_at
  BEFORE UPDATE ON public.seat_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
