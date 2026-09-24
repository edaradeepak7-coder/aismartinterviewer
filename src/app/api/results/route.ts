import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

const ALLOWED_STATUSES = ['pending', 'completed', 'failed'] as const;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const interviewId = searchParams.get('interview_id');
    const candidateId = searchParams.get('candidate_id');
    const status = searchParams.get('status');

    if (interviewId && !isValidUUID(interviewId)) return badRequestResponse('Invalid interview_id');
    if (candidateId && !isValidUUID(candidateId)) return badRequestResponse('Invalid candidate_id');
    if (status && !ALLOWED_STATUSES.includes(status as any)) return badRequestResponse('Invalid status value');

    let query = supabase
      .from('interview_results')
      .select('*, interviews(id, role, company, scheduled_at, candidate_id)')
      .order('created_at', { ascending: false });

    if (interviewId) query = query.eq('interview_id', interviewId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch results' }, 500);

    let results = data || [];
    if (candidateId && results.length > 0) {
      results = results.filter((r: any) => r.interviews?.candidate_id === candidateId);
    }

    return secureJson({ data: results });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const interview_id = sanitizeString(body.interview_id);
    if (!interview_id) return badRequestResponse('interview_id is required');
    if (!isValidUUID(interview_id)) return badRequestResponse('Invalid interview_id');

    const final_score = typeof body.final_score === 'number'
      ? Math.min(Math.max(Math.round(body.final_score), 0), 100)
      : null;

    const ALLOWED_RECOMMENDATIONS = ['strong_yes', 'yes', 'maybe', 'no'] as const;
    const recommendation = body.recommendation && ALLOWED_RECOMMENDATIONS.includes(body.recommendation)
      ? body.recommendation
      : null;

    const { data, error } = await supabase
      .from('interview_results')
      .upsert({
        interview_id,
        final_score,
        recommendation,
        ai_summary: body.ai_summary ? sanitizeString(body.ai_summary).slice(0, 5000) : null,
        strengths: Array.isArray(body.strengths) ? body.strengths.slice(0, 20) : [],
        improvements: Array.isArray(body.improvements) ? body.improvements.slice(0, 20) : [],
        competencies: Array.isArray(body.competencies) ? body.competencies.slice(0, 20) : [],
        ai_feedback: Array.isArray(body.ai_feedback) ? body.ai_feedback.slice(0, 100) : [],
        transcript_highlights: Array.isArray(body.transcript_highlights) ? body.transcript_highlights.slice(0, 20) : [],
        generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'interview_id' })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to save results' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
