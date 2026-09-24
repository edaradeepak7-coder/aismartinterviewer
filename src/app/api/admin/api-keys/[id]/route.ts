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

// PATCH /api/admin/api-keys/[id] — rotate or revoke
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { operation, masked_key, notes } = body; // operation: 'rotate' | 'revoke'

  if (!operation || !['rotate', 'revoke'].includes(operation)) {
    return NextResponse.json({ error: 'operation must be rotate or revoke' }, { status: 400 });
  }

  const now = new Date().toISOString();
  let updatePayload: Record<string, unknown> = {};

  if (operation === 'rotate') {
    if (!masked_key) return NextResponse.json({ error: 'masked_key required for rotation' }, { status: 400 });
    updatePayload = {
      masked_key,
      status: 'active',
      last_rotated_at: now,
      rotated_by: auth.user.id,
      notes: notes ?? null,
    };
  } else {
    updatePayload = {
      status: 'revoked',
      revoked_at: now,
      revoked_by: auth.user.id,
    };
  }

  const { data, error } = await supabase
    .from('api_keys')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Audit trail
  await supabase.from('api_key_audit_trail').insert({
    api_key_id: id,
    provider: data.provider,
    operation: operation === 'rotate' ? 'rotated' : 'revoked',
    performed_by: auth.user.id,
    performed_by_email: auth.user.email,
    performed_by_role: auth.role,
    ip_address: extractIpFromRequest(request),
    user_agent: extractUserAgent(request),
    outcome: 'success',
    details: { notes },
  });

  return NextResponse.json({ data });
}

// DELETE /api/admin/api-keys/[id] — hard delete (super_admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: key } = await supabase.from('api_keys').select('provider').eq('id', id).single();

  const { error } = await supabase.from('api_keys').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (key) {
    await supabase.from('api_key_audit_trail').insert({
      api_key_id: null,
      provider: key.provider,
      operation: 'revoked',
      performed_by: auth.user.id,
      performed_by_email: auth.user.email,
      performed_by_role: auth.role,
      ip_address: extractIpFromRequest(request),
      user_agent: extractUserAgent(request),
      outcome: 'success',
      details: { note: 'Hard deleted' },
    });
  }

  return NextResponse.json({ success: true });
}
