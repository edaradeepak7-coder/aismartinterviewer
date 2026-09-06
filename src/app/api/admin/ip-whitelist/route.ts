import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';


async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return null;
  return { user, role: profile.role };
}

// GET /api/admin/ip-whitelist
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('ip_whitelist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST /api/admin/ip-whitelist — add IP
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { ip_address, label, applies_to, notes, expires_at } = body;

  if (!ip_address) return NextResponse.json({ error: 'ip_address is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('ip_whitelist')
    .insert({
      ip_address,
      label: label || '',
      applies_to: applies_to || ['super_admin', 'institution_admin'],
      notes,
      expires_at: expires_at || null,
      created_by: auth.user.id,
      created_by_email: auth.user.email,
      enabled: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log event
  await supabase.from('ip_whitelist_events').insert({
    ip_address,
    user_email: auth.user.email,
    user_role: auth.role,
    event_type: 'whitelist_added',
    reason: `Added by ${auth.user.email}`,
  });

  return NextResponse.json({ data }, { status: 201 });
}
