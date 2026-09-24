import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { requireAuthenticatedUser } from '@/lib/security/apiHelpers';
import { createClient } from '@/lib/supabase/server';
import { getBillingPlan, getPlanChargeInr, CREDIT_ADDONS } from '@/lib/billing/plans';

function getRazorpay() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;
  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({ key_id, key_secret });
}

/**
 * POST /api/razorpay/order
 * Body: { planId?, addonId?, amount?, currency?, billingCycle? }
 * Creates a Razorpay order and a pending subscription row linked by order id.
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const {
      planId,
      addonId,
      amount: rawAmount,
      currency = 'INR',
      billingCycle = 'monthly',
      receipt,
    } = body;

    let amountInr = typeof rawAmount === 'number' ? rawAmount : 0;
    let credits = 0;
    let planName = 'Custom';
    let overagePaise = 500;
    let resolvedPlanId = planId || 'custom';

    if (addonId && CREDIT_ADDONS[addonId]) {
      const addon = CREDIT_ADDONS[addonId];
      amountInr = addon.priceInr;
      credits = addon.credits;
      planName = addon.name;
      resolvedPlanId = addonId;
    } else if (planId) {
      const plan = getBillingPlan(planId);
      if (!plan) {
        return NextResponse.json({ success: false, error: 'Invalid planId' }, { status: 400 });
      }
      const cycle = billingCycle === 'annual' ? 'annual' : 'monthly';
      // Always charge catalog amount — never trust client-submitted price
      amountInr = getPlanChargeInr(plan, cycle);
      if (amountInr <= 0) {
        return NextResponse.json({ success: false, error: 'Free plan does not require payment' }, { status: 400 });
      }
      credits = plan.credits;
      planName = plan.name;
      overagePaise = plan.overagePaise;
      resolvedPlanId = plan.id;
    }

    if (!amountInr || amountInr <= 0) {
      return NextResponse.json({ success: false, error: 'Invalid amount' }, { status: 400 });
    }

    const razorpay = getRazorpay();
    const order = await razorpay.orders.create({
      amount: Math.round(amountInr * 100),
      currency,
      receipt: receipt || `rcpt_${auth.user.id.slice(0, 8)}_${Date.now()}`,
      notes: {
        user_id: auth.user.id,
        plan_id: resolvedPlanId,
        plan_name: planName,
        credits: String(credits),
        price_inr: String(amountInr),
        billing_cycle: billingCycle,
        addon_id: addonId || '',
      },
    });

    const supabase = await createClient();
    const periodEnd = new Date(
      Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString();

    // Pending subscription so webhook can find the order even if client never calls verify
    if (!addonId) {
      const { data: existing } = await supabase
        .from('subscriptions')
        .select('id')
        .eq('user_id', auth.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const pendingPayload = {
        user_id: auth.user.id,
        plan_id: resolvedPlanId,
        plan_name: planName,
        status: 'incomplete',
        billing_cycle: billingCycle,
        price_inr: amountInr,
        credits_total: credits,
        credits_remaining: 0,
        credits_used: 0,
        overage_rate_paise: overagePaise,
        current_period_start: new Date().toISOString(),
        current_period_end: periodEnd,
        renewal_date: periodEnd,
        razorpay_order_id: order.id,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        await supabase.from('subscriptions').update(pendingPayload).eq('id', existing.id);
      } else {
        await supabase.from('subscriptions').insert(pendingPayload);
      }
    }

    // Draft invoice
    await supabase.from('billing_invoices').insert({
      user_id: auth.user.id,
      invoice_number: `DRAFT${Date.now()}`,
      invoice_type: addonId ? 'credit_topup' : 'subscription',
      status: 'pending',
      amount_inr: amountInr,
      total_amount_inr: amountInr,
      credits_included: credits,
      razorpay_order_id: order.id,
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      planId: resolvedPlanId,
      planName,
      credits,
      priceInr: amountInr,
    });
  } catch (error: any) {
    console.error('Razorpay order creation failed:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
