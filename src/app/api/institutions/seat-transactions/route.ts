import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const {
      institution_id,
      seats_requested,
      amount_paise,
      payment_method,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      offline_reference,
      notes,
    } = body;

    if (!institution_id || !seats_requested || !amount_paise || !payment_method) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const { data: txn, error } = await supabase
      .from('seat_transactions')
      .insert({
        institution_id,
        seats_requested,
        amount_paise,
        payment_method,
        status: payment_method === 'online' ? 'completed' : 'pending_verification',
        razorpay_order_id: razorpay_order_id || null,
        razorpay_payment_id: razorpay_payment_id || null,
        razorpay_signature: razorpay_signature || null,
        offline_reference: offline_reference || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // If online payment completed, update institution seat count
    if (payment_method === 'online') {
      await supabase.rpc('increment_institution_seats', {
        p_institution_id: institution_id,
        p_seats: seats_requested,
      }).catch(() => {
        // Fallback: direct update
        supabase
          .from('institutions')
          .select('total_seats')
          .eq('id', institution_id)
          .single()
          .then(({ data: inst }) => {
            if (inst) {
              supabase
                .from('institutions')
                .update({ total_seats: inst.total_seats + seats_requested })
                .eq('id', institution_id);
            }
          });
      });
    }

    return NextResponse.json({ success: true, transaction: txn });
  } catch (error: any) {
    console.error('Seat transaction error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to record transaction' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const institution_id = searchParams.get('institution_id');

    if (!institution_id) {
      return NextResponse.json({ success: false, error: 'institution_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('seat_transactions')
      .select('*')
      .eq('institution_id', institution_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ success: true, transactions: data || [] });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
