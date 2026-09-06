-- ─── Fix: Infinite Recursion in user_profiles_select_policy ─────────────────
-- Root cause: user_profiles_select_policy calls public.get_my_role() which
-- queries public.user_profiles → triggers the same policy → infinite loop.
--
-- Fix: Create a SECURITY DEFINER function that reads role from auth.users
-- raw_user_meta_data (bypasses RLS entirely) for use ONLY on user_profiles table.
-- All other tables continue using public.get_my_role() which is safe for them.

-- ─── 1. Helper: read role from auth.users metadata (no user_profiles query) ──

CREATE OR REPLACE FUNCTION public.get_my_role_from_auth()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    raw_user_meta_data->>'role',
    raw_app_meta_data->>'role',
    'candidate'
  )
  FROM auth.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- ─── 2. Fix user_profiles policy — use auth.users metadata, NOT user_profiles ─
-- This breaks the recursion: policy on user_profiles no longer queries user_profiles.

DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;
CREATE POLICY "user_profiles_select_policy"
  ON public.user_profiles FOR SELECT
  USING (
    id = auth.uid()
    OR public.get_my_role_from_auth() = 'admin'
  );

-- ─── 3. Ensure users_manage_own_user_profiles doesn't conflict ───────────────
-- The original migration created this ALL policy; keep it but ensure it doesn't
-- block the select policy above. Drop and recreate to be safe.

DROP POLICY IF EXISTS "users_manage_own_user_profiles" ON public.user_profiles;
CREATE POLICY "users_manage_own_user_profiles"
  ON public.user_profiles FOR ALL TO authenticated
  USING (
    id = auth.uid()
    OR public.get_my_role_from_auth() = 'admin'
  )
  WITH CHECK (
    id = auth.uid()
    OR public.get_my_role_from_auth() = 'admin'
  );
