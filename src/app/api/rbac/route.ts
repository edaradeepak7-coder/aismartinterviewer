import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';
import { writeAuditLogServer } from '@/lib/security/auditLog';
import { sendSecurityAlert, getAdminEmails } from '@/lib/security/securityAlerts';

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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let query = supabase
      .from('user_profiles')
      .select('id, full_name, email, role, tenant_id, created_at')
      .order('role', { ascending: true });

    if (role) query = query.eq('role', role);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch RBAC data' }, 500);

    // Aggregate role counts
    const roleCounts: Record<string, number> = {};
    (data || []).forEach((u: any) => {
      roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;
    });

    return secureJson({ data, roleCounts });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function PATCH(request: NextRequest) {
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
    const { userId, newRole } = body;

    const ALLOWED_ROLES = ['super_admin', 'institution_admin', 'org_admin', 'recruiter', 'placement_officer', 'evaluator', 'faculty', 'candidate'];
    if (!userId || !newRole || !ALLOWED_ROLES.includes(newRole)) {
      return secureJson({ error: 'Invalid userId or role' }, 400);
    }

    // Get previous role for audit
    const { data: targetBefore } = await supabase
      .from('user_profiles')
      .select('email, role')
      .eq('id', userId)
      .single();

    const { data, error } = await supabase
      .from('user_profiles')
      .update({ role: newRole, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to update role' }, 500);

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // Write audit log for role change
    await writeAuditLogServer(
      {
        user_id: user.id,
        user_email: user.email,
        user_role: profile.role,
        action: 'role_changed',
        resource: 'user_profile',
        resource_id: userId,
        ip_address: ip,
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        outcome: 'success',
        details: {
          target_user_email: targetBefore?.email,
          previous_role: targetBefore?.role,
          new_role: newRole,
          changed_by: user.email,
        },
      },
      supabase
    );

    // Send security alert if role changed to/from admin roles
    const adminRoles = ['super_admin', 'institution_admin', 'org_admin'];
    const isPrivilegedChange =
      adminRoles.includes(newRole) || adminRoles.includes(targetBefore?.role ?? '');

    if (isPrivilegedChange) {
      const adminEmails = await getAdminEmails();
      await sendSecurityAlert({
        eventType: 'role_change',
        userId: user.id,
        userEmail: user.email,
        ipAddress: ip,
        targetRole: newRole,
        details: `Role changed from ${targetBefore?.role ?? 'unknown'} to ${newRole} for ${targetBefore?.email ?? userId}`,
        adminEmails,
      });
    }

    return secureJson({ data });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
