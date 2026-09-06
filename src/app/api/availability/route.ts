import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const recruiterId = searchParams.get('recruiter_id');
    const status = searchParams.get('status') || 'available';
    const fromDate = searchParams.get('from') || new Date().toISOString().split('T')[0];

    let query = supabase
      .from('recruiter_availability')
      .select('*, user_profiles(full_name, email)')
      .gte('slot_date', fromDate)
      .order('slot_date', { ascending: true })
      .order('start_time', { ascending: true });

    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    if (status !== 'all') query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { slot_date, start_time, end_time, duration_minutes, notes } = body;

    if (!slot_date || !start_time || !end_time) {
      return NextResponse.json({ error: 'slot_date, start_time, and end_time are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recruiter_availability')
      .insert({
        recruiter_id: user.id,
        slot_date,
        start_time,
        end_time,
        duration_minutes: duration_minutes || 45,
        status: 'available',
        notes: notes || null,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
