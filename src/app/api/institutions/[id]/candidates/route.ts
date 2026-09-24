import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/sanitize';

type RouteCtx = { params: Promise<{ id: string }> };

// GET /api/institutions/[id]/candidates
export async function GET(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

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
      .eq('institution_id', id)
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

// POST /api/institutions/[id]/candidates
// Body A: { candidate_id } → issue seat
// Body B: { candidates: [...] } → bulk create
export async function POST(request: NextRequest, { params }: RouteCtx) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // ── Bulk create ──────────────────────────────────────────────────────────
    if (Array.isArray(body.candidates)) {
      const rows = body.candidates
        .map((c: any) => ({
          institution_id: id,
          name: sanitizeString(c.name || '').slice(0, 200),
          email: sanitizeString(c.email || '').toLowerCase().slice(0, 200),
          program: sanitizeString(c.program || 'B.Tech').slice(0, 100),
          year: sanitizeString(c.year || '').slice(0, 50),
          course: sanitizeString(c.course || '').slice(0, 100),
          branch: sanitizeString(c.branch || '').slice(0, 100),
          section: sanitizeString(c.section || '').slice(0, 50),
          status: 'inactive',
          seat_issued: false,
          registered_at: new Date().toISOString(),
        }))
        .filter((c: any) => c.name && c.email.includes('@'));

      if (rows.length === 0) {
        return NextResponse.json({ success: false, error: 'No valid candidates to import' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('institution_candidates')
        .upsert(rows, { onConflict: 'institution_id,email', ignoreDuplicates: false })
        .select();

      if (error) {
        // Fallback without upsert if unique constraint name differs
        const { data: inserted, error: insertErr } = await supabase
          .from('institution_candidates')
          .insert(rows)
          .select();
        if (insertErr) throw insertErr;
        return NextResponse.json({ success: true, candidates: inserted || [], imported: inserted?.length || 0 }, { status: 201 });
      }

      return NextResponse.json({ success: true, candidates: data || [], imported: data?.length || 0 }, { status: 201 });
    }

    // ── Issue seat ───────────────────────────────────────────────────────────
    const candidate_id = body.candidate_id;
    if (!candidate_id) {
      return NextResponse.json({ success: false, error: 'candidate_id or candidates[] required' }, { status: 400 });
    }

    const { data: institution } = await supabase
      .from('institutions')
      .select('total_seats, used_seats, status')
      .eq('id', id)
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

    const { data: candidate, error: candError } = await supabase
      .from('institution_candidates')
      .update({ seat_issued: true, seat_issued_at: new Date().toISOString(), status: 'active' })
      .eq('id', candidate_id)
      .eq('institution_id', id)
      .select()
      .single();

    if (candError) throw candError;

    await supabase
      .from('institutions')
      .update({ used_seats: institution.used_seats + 1 })
      .eq('id', id);

    return NextResponse.json({ success: true, candidate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
