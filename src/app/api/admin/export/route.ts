import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { unauthorizedResponse, forbiddenResponse, badRequestResponse } from '@/lib/security/apiHelpers';

function toCSV(rows: Record<string, any>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  return [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n');
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Verify admin role — export is sensitive data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return forbiddenResponse('Admin access required');
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const ALLOWED_TYPES = ['candidates', 'interviews', 'feedback'] as const;
    if (!type || !ALLOWED_TYPES.includes(type as any)) {
      return badRequestResponse('Invalid export type. Use: candidates, interviews, or feedback');
    }

    let csv = '';
    let filename = 'export.csv';

    if (type === 'candidates') {
      const { data, error } = await supabase
        .from('candidates')
        .select('id, name, email, role, department, experience_level, created_at')
        .order('created_at', { ascending: false });
      if (error) return badRequestResponse('Failed to fetch candidates');
      csv = toCSV(
        (data || []).map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          role: c.role || '',
          department: c.department || '',
          experience_level: c.experience_level || '',
          joined: c.created_at?.split('T')[0] || '',
        }))
      );
      filename = `candidates_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'interviews') {
      const { data, error } = await supabase
        .from('interviews')
        .select('id, role, company, department, interview_type, status, scheduled_at, completed_at, duration_minutes, overall_score, technical_score, communication_score, role_alignment_score, recommendation, candidates(name, email)')
        .order('scheduled_at', { ascending: false });
      if (error) return badRequestResponse('Failed to fetch interviews');
      csv = toCSV(
        (data || []).map((i: any) => ({
          id: i.id,
          candidate_name: i.candidates?.name || '',
          candidate_email: i.candidates?.email || '',
          role: i.role,
          company: i.company || '',
          department: i.department || '',
          interview_type: i.interview_type,
          status: i.status,
          scheduled_at: i.scheduled_at?.split('T')[0] || '',
          completed_at: i.completed_at?.split('T')[0] || '',
          duration_minutes: i.duration_minutes ?? '',
          overall_score: i.overall_score ?? '',
          technical_score: i.technical_score ?? '',
          communication_score: i.communication_score ?? '',
          role_alignment_score: i.role_alignment_score ?? '',
          recommendation: i.recommendation || '',
        }))
      );
      filename = `interviews_${new Date().toISOString().split('T')[0]}.csv`;
    } else if (type === 'feedback') {
      const { data, error } = await supabase
        .from('recruiter_feedback')
        .select('id, strengths, gaps, recommendation_notes, overall_recommendation, is_confidential, created_at, interviews(role, scheduled_at), candidates(name, email)')
        .order('created_at', { ascending: false });
      if (error) return badRequestResponse('Failed to fetch feedback');
      csv = toCSV(
        (data || []).map((f: any) => ({
          id: f.id,
          candidate_name: f.candidates?.name || '',
          candidate_email: f.candidates?.email || '',
          interview_role: f.interviews?.role || '',
          interview_date: f.interviews?.scheduled_at?.split('T')[0] || '',
          strengths: f.strengths || '',
          gaps: f.gaps || '',
          recommendation_notes: f.recommendation_notes || '',
          overall_recommendation: f.overall_recommendation || '',
          is_confidential: f.is_confidential ? 'Yes' : 'No',
          submitted_at: f.created_at?.split('T')[0] || '',
        }))
      );
      filename = `recruiter_feedback_${new Date().toISOString().split('T')[0]}.csv`;
    }

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store, no-cache',
      },
    });
  } catch {
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
