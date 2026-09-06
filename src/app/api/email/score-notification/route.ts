import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendScoreNotificationEmail } from '@/lib/services/emailService';

/**
 * POST /api/email/score-notification
 * Sends score notification after interview completion.
 * Body: { interviewId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId required' }, { status: 400 });
    }

    // Fetch interview + result
    const { data: interview, error: iErr } = await supabase
      .from('interviews')
      .select('id, type, user_id, user_profiles(email, full_name)')
      .eq('id', interviewId)
      .single();

    if (iErr || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const { data: result } = await supabase
      .from('interview_results')
      .select('overall_score, grade, breakdown')
      .eq('interview_id', interviewId)
      .single();

    const profile = (interview as any).user_profiles;
    if (!profile?.email) {
      return NextResponse.json({ error: 'No email for user' }, { status: 400 });
    }

    const score = result?.overall_score ?? 0;

    await sendScoreNotificationEmail(
      profile.email,
      profile.full_name || 'Candidate',
      score,
      interview.type || 'Interview',
      {
        grade: result?.grade,
        breakdown: result?.breakdown,
        resultsUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/interview-results`,
      }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
