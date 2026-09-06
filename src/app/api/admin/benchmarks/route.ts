import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/admin/benchmarks
 * Returns all role benchmarks.
 *
 * POST /api/admin/benchmarks
 * Upserts a role benchmark.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('role_benchmarks')
      .select('*')
      .order('role_name', { ascending: true });

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
    const {
      role_name,
      technical_depth_benchmark,
      problem_solving_benchmark,
      system_design_benchmark,
      communication_benchmark,
      role_alignment_benchmark,
      avg_score_benchmark,
    } = body;

    if (!role_name) return NextResponse.json({ error: 'role_name is required' }, { status: 400 });

    const { data, error } = await supabase
      .from('role_benchmarks')
      .upsert({
        role_name,
        technical_depth_benchmark: technical_depth_benchmark ?? 75,
        problem_solving_benchmark: problem_solving_benchmark ?? 72,
        system_design_benchmark: system_design_benchmark ?? 70,
        communication_benchmark: communication_benchmark ?? 78,
        role_alignment_benchmark: role_alignment_benchmark ?? 74,
        avg_score_benchmark: avg_score_benchmark ?? 74,
      }, { onConflict: 'role_name' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
