import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const candidateId = searchParams.get('candidate_id');
    const recruiterId = searchParams.get('recruiter_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('job_offers')
      .select('*, candidates(name, email, avatar_initials)')
      .order('created_at', { ascending: false });

    if (candidateId) query = query.eq('candidate_id', candidateId);
    if (recruiterId) query = query.eq('recruiter_id', recruiterId);
    if (status) query = query.eq('status', status);

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
    const { interview_id, candidate_id, role, company, department, salary_range, start_date, offer_details, expires_at, next_steps, interview_prep_tips } = body;

    if (!candidate_id || !role) {
      return NextResponse.json({ error: 'candidate_id and role are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('job_offers')
      .insert({
        interview_id: interview_id || null,
        candidate_id,
        recruiter_id: user.id,
        role,
        company: company || 'Meridian Technologies',
        department: department || null,
        salary_range: salary_range || null,
        start_date: start_date || null,
        offer_details: offer_details || null,
        status: 'pending',
        expires_at: expires_at || null,
        next_steps: next_steps || [],
        interview_prep_tips: interview_prep_tips || [],
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
