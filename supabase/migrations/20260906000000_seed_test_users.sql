-- ============================================================
-- Seed: Test users for all 8 roles
-- Credentials are displayed on the login page for testing.
-- Password for ALL test accounts: TestPass@123
-- ============================================================

-- Helper: create auth user + profile in one block
-- Uses Supabase's auth.users table directly (service-role migration)

DO $$
DECLARE
  v_super_admin_id   uuid := '00000001-0000-0000-0000-000000000001';
  v_inst_admin_id    uuid := '00000001-0000-0000-0000-000000000002';
  v_org_admin_id     uuid := '00000001-0000-0000-0000-000000000003';
  v_recruiter_id     uuid := '00000001-0000-0000-0000-000000000004';
  v_placement_id     uuid := '00000001-0000-0000-0000-000000000005';
  v_evaluator_id     uuid := '00000001-0000-0000-0000-000000000006';
  v_faculty_id       uuid := '00000001-0000-0000-0000-000000000007';
  v_candidate_id     uuid := '00000001-0000-0000-0000-000000000008';
  v_encrypted_pw     text;
BEGIN
  -- bcrypt hash of "TestPass@123"
  v_encrypted_pw := crypt('TestPass@123', gen_salt('bf'));

  -- ── 1. Super Admin ──────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_super_admin_id, '00000000-0000-0000-0000-000000000000',
    'superadmin@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Super Admin Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_super_admin_id, 'superadmin@test.ai', 'Super Admin Test', 'super_admin', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'super_admin', updated_at = now();

  -- ── 2. Institution Admin ────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_inst_admin_id, '00000000-0000-0000-0000-000000000000',
    'instadmin@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Institution Admin Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_inst_admin_id, 'instadmin@test.ai', 'Institution Admin Test', 'institution_admin', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'institution_admin', updated_at = now();

  -- ── 3. Organization Admin ───────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_org_admin_id, '00000000-0000-0000-0000-000000000000',
    'orgadmin@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Org Admin Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_org_admin_id, 'orgadmin@test.ai', 'Org Admin Test', 'org_admin', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'org_admin', updated_at = now();

  -- ── 4. Recruiter ────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_recruiter_id, '00000000-0000-0000-0000-000000000000',
    'recruiter@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Recruiter Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_recruiter_id, 'recruiter@test.ai', 'Recruiter Test', 'recruiter', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'recruiter', updated_at = now();

  -- ── 5. Placement Officer ────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_placement_id, '00000000-0000-0000-0000-000000000000',
    'placement@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Placement Officer Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_placement_id, 'placement@test.ai', 'Placement Officer Test', 'placement_officer', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'placement_officer', updated_at = now();

  -- ── 6. Evaluator ────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_evaluator_id, '00000000-0000-0000-0000-000000000000',
    'evaluator@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Evaluator Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_evaluator_id, 'evaluator@test.ai', 'Evaluator Test', 'evaluator', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'evaluator', updated_at = now();

  -- ── 7. Faculty ──────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_faculty_id, '00000000-0000-0000-0000-000000000000',
    'faculty@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Faculty Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_faculty_id, 'faculty@test.ai', 'Faculty Test', 'faculty', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'faculty', updated_at = now();

  -- ── 8. Candidate ────────────────────────────────────────────
  INSERT INTO auth.users (
    id, instance_id, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    aud, role, confirmation_token, recovery_token, email_change_token_new, email_change
  ) VALUES (
    v_candidate_id, '00000000-0000-0000-0000-000000000000',
    'candidate@test.ai', v_encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Candidate Test"}',
    now(), now(), 'authenticated', 'authenticated', '', '', '', ''
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (v_candidate_id, 'candidate@test.ai', 'Candidate Test', 'candidate', now(), now())
  ON CONFLICT (id) DO UPDATE SET role = 'candidate', updated_at = now();

END $$;
