import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendSeatPurchaseConfirmationEmail } from '@/lib/services/emailService';

/**
 * POST /api/email/seat-purchase
 * Sends seat purchase confirmation email to institution admin.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { seats, amount, paymentMethod, transactionId, institutionId } = await request.json();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('email, full_name')
      .eq('id', user.id)
      .single();

    if (!profile?.email) {
      return NextResponse.json({ error: 'No email found' }, { status: 400 });
    }

    await sendSeatPurchaseConfirmationEmail(
      profile.email,
      profile.full_name || 'Institution Admin',
      seats,
      amount,
      paymentMethod,
      { transactionId, institutionId }
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
