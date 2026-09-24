import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * GET /api/alert-notifications?limit=
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const limit = Math.min(
      200,
      Math.max(1, parseInt(request.nextUrl.searchParams.get('limit') || '100', 10) || 100),
    );

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('alert_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) return secureJson({ error: error.message }, 500);

    return secureJson({ data: data || [] });
  } catch {
    return serverErrorResponse();
  }
}
