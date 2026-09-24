import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { requireAuthenticatedUser } from '@/lib/security/apiHelpers';
import { createClient } from '@/lib/supabase/server';
import { fulfillRazorpayPayment } from '@/lib/billing/fulfillRazorpayPayment';

/**
 * POST /api/razorpay/verify
 * Verifies Razorpay checkout signature and activates subscription / credits server-side.
 *
 * Body: {
 *   razorpay_order_id, razorpay_payment_id, razorpay_signature,
 *   planId?, addonId?, priceInr?, credits?, billingCycle?
 * }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planId,
      addonId,
      priceInr,
      credits,
      billingCycle,
      planName,
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, error: 'Missing payment details' }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Payment not configured' }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(razorpay_signature)
      );
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const supabase = await createClient();
    const result = await fulfillRazorpayPayment(supabase, {
      userId: auth.user.id,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      planId,
      addonId,
      priceInr,
      credits,
      billingCycle,
      planName,
    });

    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: result.error || 'Fulfillment failed' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.alreadyFulfilled ? 'Payment already fulfilled' : 'Payment verified',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      subscriptionId: result.subscriptionId,
      alreadyFulfilled: result.alreadyFulfilled === true,
    });
  } catch (error) {
    console.error('Verification failed:', error);
    return NextResponse.json({ success: false, error: 'Verification failed' }, { status: 500 });
  }
}
