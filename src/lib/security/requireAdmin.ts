import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

export const ADMIN_ROLES = new Set([
  'admin',
  'super_admin',
  'org_admin',
  'institution_admin',
]);

export type AdminAuth = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: { id: string; email?: string };
  profile: { role: string; email?: string | null };
};

/**
 * Authenticate and require an admin role via user_profiles.
 * Returns { error } on failure, or { supabase, user, profile } on success.
 */
export async function requireAdmin(
  message = 'Admin access required',
): Promise<AdminAuth | { error: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: unauthorizedResponse() as Response };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !ADMIN_ROLES.has(profile.role)) {
    return { error: forbiddenResponse(message) as Response };
  }

  return {
    supabase,
    user: { id: user.id, email: user.email },
    profile: { role: profile.role, email: profile.email },
  };
}

export function isAdminAuth(
  auth: AdminAuth | { error: Response },
): auth is AdminAuth {
  return !('error' in auth);
}
