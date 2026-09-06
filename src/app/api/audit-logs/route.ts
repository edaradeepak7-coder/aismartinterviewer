import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, badRequestResponse, serverErrorResponse } from '@/lib/security/apiHelpers';
import { writeAuditLogServer } from '@/lib/security/auditLog';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Only admins can read audit logs
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const adminRoles = ['super_admin', 'institution_admin', 'admin'];
    if (!profile || !adminRoles.includes(profile.role)) {
      return unauthorizedResponse('Admin access required');
    }

    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1'));
    const limit = Math.min(100, parseInt(url.searchParams.get('limit') ?? '50'));
    const action = url.searchParams.get('action');
    const outcome = url.searchParams.get('outcome');
    const userId = url.searchParams.get('user_id');
    const from = url.searchParams.get('from');
    const to = url.searchParams.get('to');

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * limit, page * limit - 1);

    if (action) query = query.eq('action', action);
    if (outcome) query = query.eq('outcome', outcome);
    if (userId) query = query.eq('user_id', userId);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);

    const { data, error, count } = await query;
    if (error) return serverErrorResponse();

    return secureJson({ logs: data, total: count, page, limit });
  } catch {
    return serverErrorResponse();
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const body = await request.json();
    const { action, resource, resource_id, outcome, details, user_email, user_role } = body;

    if (!action || !outcome) {
      return badRequestResponse('action and outcome are required');
    }

    await writeAuditLogServer(
      {
        user_id: user?.id,
        user_email: user_email ?? user?.email,
        user_role,
        action,
        resource,
        resource_id,
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown',
        user_agent: request.headers.get('user-agent') ?? 'unknown',
        outcome,
        details: details ?? {},
      },
      supabase
    );

    return secureJson({ success: true });
  } catch {
    return serverErrorResponse();
  }
}
