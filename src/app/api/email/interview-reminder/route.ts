import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendInterviewReminderEmail } from '@/lib/services/emailService';

/**
 * POST /api/email/interview-reminder
 * Sends a 24h reminder for an upcoming interview.
 * Body: { interviewId: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { interviewId } = await request.json();

    if (!interviewId) {
      return NextResponse.json({ error: 'interviewId required' }, { status: 400 });
    }

    // Fetch interview details
    const { data: interview, error } = await supabase
      .from('interviews')
      .select('id, scheduled_at, type, user_id, user_profiles(email, full_name)')
      .eq('id', interviewId)
      .single();

    if (error || !interview) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    const profile = (interview as any).user_profiles;
    if (!profile?.email) {
      return NextResponse.json({ error: 'No email for user' }, { status: 400 });
    }

    const scheduledDate = interview.scheduled_at
      ? new Date(interview.scheduled_at).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'short' })
      : 'Tomorrow';

    await sendInterviewReminderEmail(
      profile.email,
      profile.full_name || 'Candidate',
      interview.type || 'Interview',
      scheduledDate,
      { interviewUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/live-interview?id=${interview.id}` }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
