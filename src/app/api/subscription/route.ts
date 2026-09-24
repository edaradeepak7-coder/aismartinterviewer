import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse, forbiddenResponse } from '@/lib/security/apiHelpers';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    if (!profile) return forbiddenResponse();

    // Fetch subscription for the tenant
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return secureJson({ error: 'Failed to fetch subscription' }, 500);

    // Fetch credit usage summary
    const { data: usage } = await supabase
      .from('credit_usage')
      .select('feature, credits_used, created_at')
      .eq('tenant_id', profile.tenant_id)
      .order('created_at', { ascending: false })
      .limit(500);

    return secureJson({ data: { subscription, usage: usage || [] } });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, tenant_id')
      .eq('id', user.id)
      .single();

    const ADMIN_ROLES = ['super_admin', 'institution_admin', 'org_admin'];
    if (!profile || !ADMIN_ROLES.includes(profile.role)) return forbiddenResponse();

    const body = await request.json();
    const { credits_to_add, package_id } = body;

    if (!credits_to_add || typeof credits_to_add !== 'number' || credits_to_add <= 0) {
      return secureJson({ error: 'Invalid credits_to_add value' }, 400);
    }

    // Upsert credit top-up record
    const { data, error } = await supabase
      .from('credit_topups')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: user.id,
        credits_added: credits_to_add,
        package_id: package_id || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to record top-up' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
