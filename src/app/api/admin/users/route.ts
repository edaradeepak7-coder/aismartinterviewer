import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/admin/users
 * Returns all user profiles for admin management.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Verify admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return forbiddenResponse('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const ALLOWED_ROLES = ['admin', 'recruiter', 'candidate'] as const;
    if (role && !ALLOWED_ROLES.includes(role as any)) {
      return badRequestResponse('Invalid role filter');
    }

    const safeSearch = search ? sanitizeString(search).slice(0, 100) : null;

    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (safeSearch) query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch users' }, 500);

    return secureJson({ data: data || [] });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
