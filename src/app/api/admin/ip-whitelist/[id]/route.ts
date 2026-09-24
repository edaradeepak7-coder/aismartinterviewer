import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return null;
  return { user, role: profile.role };
}

// PATCH /api/admin/ip-whitelist/[id] — toggle enabled or update
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { enabled, label, notes, applies_to, expires_at } = body;

  const updatePayload: Record<string, unknown> = {};
  if (enabled !== undefined) updatePayload.enabled = enabled;
  if (label !== undefined) updatePayload.label = label;
  if (notes !== undefined) updatePayload.notes = notes;
  if (applies_to !== undefined) updatePayload.applies_to = applies_to;
  if (expires_at !== undefined) updatePayload.expires_at = expires_at;

  const { data, error } = await supabase
    .from('ip_whitelist')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('ip_whitelist_events').insert({
    ip_address: data.ip_address,
    user_email: auth.user.email,
    user_role: auth.role,
    event_type: 'whitelist_updated',
    reason: `Updated by ${auth.user.email}`,
  });

  return NextResponse.json({ data });
}

// DELETE /api/admin/ip-whitelist/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: entry } = await supabase.from('ip_whitelist').select('ip_address').eq('id', id).single();

  const { error } = await supabase.from('ip_whitelist').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (entry) {
    await supabase.from('ip_whitelist_events').insert({
      ip_address: entry.ip_address,
      user_email: auth.user.email,
      user_role: auth.role,
      event_type: 'whitelist_removed',
      reason: `Removed by ${auth.user.email}`,
    });
  }

  return NextResponse.json({ success: true });
}
