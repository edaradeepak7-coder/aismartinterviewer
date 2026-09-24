import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';
import { writeAuditLogServer } from '@/lib/security/auditLog';
import { sendSecurityAlert, getAdminEmails } from '@/lib/security/securityAlerts';
import { buildCacheKey, cacheGet, cacheSet, cacheInvalidate, CACHE_TTL } from '@/lib/redis/cache';

const ADMIN_ROLES = ['super_admin', 'institution_admin', 'org_admin'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !ADMIN_ROLES.includes(profile.role)) return forbiddenResponse();

    // Cache session list per admin user
    const cacheKey = buildCacheKey('sessions:list', { userId: user.id });
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return secureJson({ data: cached });
    }

    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, email, role, tenant_id, updated_at, created_at')
      .order('updated_at', { ascending: false })
      .limit(100);

    if (error) return secureJson({ error: 'Failed to fetch sessions' }, 500);

    const result = data || [];
    await cacheSet(cacheKey, result, CACHE_TTL.SESSION_DATA);
    return secureJson({ data: result });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'super_admin') return forbiddenResponse();

    const body = await request.json();
    const { userId } = body;
    if (!userId) return secureJson({ error: 'userId is required' }, 400);

    const { data: targetProfile } = await supabase
      .from('user_profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    const { error } = await supabase.auth.admin.signOut(userId);
    if (error) return secureJson({ error: 'Failed to revoke session' }, 500);

    // Invalidate session list cache after revocation
    const cacheKey = buildCacheKey('sessions:list', { userId: user.id });
    await cacheInvalidate(cacheKey);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: 'session_revoked',
        resource: 'session',
        resource_id: userId,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        outcome: 'success',
        details: {
          revoked_user_email: targetProfile?.email,
          revoked_user_role: targetProfile?.role,
          revoked_by: user.email,
        },
      },
      supabase
    );

    const adminEmails = await getAdminEmails();
    await sendSecurityAlert({
      eventType: 'session_revoked',
      userId: user.id,
      userEmail: user.email,
      ipAddress: ip,
      details: `Session revoked for user: ${targetProfile?.email ?? userId}`,
      adminEmails,
    });

    return secureJson({ success: true });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
