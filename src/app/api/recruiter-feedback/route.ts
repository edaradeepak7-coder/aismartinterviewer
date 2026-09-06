import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interview_id');
    const candidateId = searchParams.get('candidate_id');

    let query = supabase
      .from('recruiter_feedback')
      .select('*, interviews(role, scheduled_at), candidates(name, email)')
      .order('created_at', { ascending: false });

    if (interviewId) query = query.eq('interview_id', interviewId);
    if (candidateId) query = query.eq('candidate_id', candidateId);

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
    const { interview_id, candidate_id, strengths, gaps, recommendation_notes, overall_recommendation, is_confidential } = body;

    if (!interview_id || !candidate_id) {
      return NextResponse.json({ error: 'interview_id and candidate_id are required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('recruiter_feedback')
      .insert({
        interview_id,
        candidate_id,
        recruiter_id: user.id,
        strengths: strengths || '',
        gaps: gaps || '',
        recommendation_notes: recommendation_notes || '',
        overall_recommendation: overall_recommendation || null,
        is_confidential: is_confidential !== false,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
