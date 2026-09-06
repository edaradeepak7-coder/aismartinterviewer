import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { extractIpFromRequest, extractUserAgent } from '@/lib/security/auditLog';

async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return null;
  return { user, role: profile.role };
}

// GET /api/admin/api-keys — list all API keys
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .order('provider', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/admin/api-keys — create a new API key record
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { provider, label, masked_key, notes } = body;

  if (!provider || !masked_key) {
    return NextResponse.json({ error: 'provider and masked_key are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ provider, label: label || 'Production', masked_key, notes, created_by: auth.user.id, status: 'active' })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit trail
  await supabase.from('api_key_audit_trail').insert({
    api_key_id: data.id,
    provider,
    operation: 'created',
    performed_by: auth.user.id,
    performed_by_email: auth.user.email,
    performed_by_role: auth.role,
    ip_address: extractIpFromRequest(request),
    user_agent: extractUserAgent(request),
    outcome: 'success',
  });

  return NextResponse.json({ data }, { status: 201 });
}
