import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'super_admin') return null;
  return { user, role: profile.role };
}

// GET /api/admin/api-keys/[id]/audit — fetch audit trail for a key
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const auth = await requireSuperAdmin(supabase);
  if (!auth) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data, error } = await supabase
    .from('api_key_audit_trail')
    .select('*')
    .eq('api_key_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
