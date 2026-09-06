import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/institutions/[id]/candidates - list candidates with filters
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const program = searchParams.get('program');
    const year = searchParams.get('year');
    const course = searchParams.get('course');
    const branch = searchParams.get('branch');
    const section = searchParams.get('section');
    const status = searchParams.get('status');

    let query = supabase
      .from('institution_candidates')
      .select('*')
      .eq('institution_id', params.id)
      .order('registered_at', { ascending: false });

    if (program) query = query.eq('program', program);
    if (year) query = query.eq('year', year);
    if (course) query = query.eq('course', course);
    if (branch) query = query.eq('branch', branch);
    if (section) query = query.eq('section', section);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, candidates: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/institutions/[id]/candidates - issue seat to candidate
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { candidate_id } = body;

    if (!candidate_id) {
      return NextResponse.json({ success: false, error: 'candidate_id required' }, { status: 400 });
    }

    // Check available seats
    const { data: institution } = await supabase
      .from('institutions')
      .select('total_seats, used_seats, status')
      .eq('id', params.id)
      .single();

    if (!institution) {
      return NextResponse.json({ success: false, error: 'Institution not found' }, { status: 404 });
    }
    if (institution.status !== 'approved') {
      return NextResponse.json({ success: false, error: 'Institution not approved' }, { status: 403 });
    }
    if (institution.used_seats >= institution.total_seats) {
      return NextResponse.json({ success: false, error: 'No seats available. Please purchase more seats.' }, { status: 400 });
    }

    // Issue seat
    const { data: candidate, error: candError } = await supabase
      .from('institution_candidates')
      .update({ seat_issued: true, seat_issued_at: new Date().toISOString(), status: 'active' })
      .eq('id', candidate_id)
      .eq('institution_id', params.id)
      .select()
      .single();

    if (candError) throw candError;

    // Increment used_seats
    await supabase
      .from('institutions')
      .update({ used_seats: institution.used_seats + 1 })
      .eq('id', params.id);

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
