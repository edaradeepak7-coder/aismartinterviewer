-- Broaden rls_audit_events RLS to match user_profiles admin roles
-- (original policy only checked auth.users metadata for role = 'admin')

DROP POLICY IF EXISTS "admin_full_access_rls_audit_events" ON public.rls_audit_events;

CREATE POLICY "admins_manage_rls_audit_events"
ON public.rls_audit_events FOR ALL TO authenticated
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

-- Allow service / server inserts from authenticated clients that pass API auth
-- (API still gates; this covers edge writers)
DROP POLICY IF EXISTS "service_insert_rls_audit_events" ON public.rls_audit_events;
CREATE POLICY "service_insert_rls_audit_events"
ON public.rls_audit_events FOR INSERT TO authenticated
WITH CHECK (true);
