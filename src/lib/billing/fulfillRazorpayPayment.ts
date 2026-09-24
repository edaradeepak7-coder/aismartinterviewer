import type { SupabaseClient } from '@supabase/supabase-js';
import { getBillingPlan, getPlanChargeInr, CREDIT_ADDONS } from '@/lib/billing/plans';

export interface FulfillPaymentInput {
  userId: string;
  orderId: string;
  paymentId: string;
  /** Plan purchase */
  planId?: string;
  planName?: string;
  priceInr?: number;
  credits?: number;
  overagePaise?: number;
  billingCycle?: 'monthly' | 'annual';
  /** Credit-only top-up (addon) */
  addonId?: string;
}

export interface FulfillPaymentResult {
  ok: boolean;
  subscriptionId?: string;
  alreadyFulfilled?: boolean;
  error?: string;
}

/**
 * Idempotent activation of a Razorpay order:
 * - marks / creates subscription as active
 * - grants credits
 * - writes billing invoice if missing
 */
export async function fulfillRazorpayPayment(
  supabase: SupabaseClient,
  input: FulfillPaymentInput
): Promise<FulfillPaymentResult> {
  const {
    userId,
    orderId,
    paymentId,
    planId,
    addonId,
    billingCycle = 'monthly',
  } = input;

  if (!userId || !orderId || !paymentId) {
    return { ok: false, error: 'Missing userId, orderId, or paymentId' };
  }

  // Idempotency: invoice already paid for this order
  const { data: existingInvoice } = await supabase
    .from('billing_invoices')
    .select('id, status')
    .eq('razorpay_order_id', orderId)
    .eq('status', 'paid')
    .maybeSingle();

  if (existingInvoice) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('razorpay_order_id', orderId)
      .maybeSingle();
    return {
      ok: true,
      alreadyFulfilled: true,
      subscriptionId: sub?.id,
    };
  }

  // Resolve plan / addon credits
  let resolvedPlanId = planId || 'starter';
  let resolvedPlanName = input.planName || 'Starter';
  let priceInr = input.priceInr ?? 0;
  let credits = input.credits ?? 0;
  let overagePaise = input.overagePaise ?? 500;

  if (addonId && CREDIT_ADDONS[addonId]) {
    const addon = CREDIT_ADDONS[addonId];
    resolvedPlanName = addon.name;
    priceInr = addon.priceInr;
    credits = addon.credits;
  } else if (planId) {
    const plan = getBillingPlan(planId);
    if (plan) {
      resolvedPlanId = plan.id;
      resolvedPlanName = plan.name;
      priceInr = getPlanChargeInr(plan, billingCycle === 'annual' ? 'annual' : 'monthly');
      credits = plan.credits;
      overagePaise = plan.overagePaise;
    }
  }

  const periodEnd = new Date(
    Date.now() + (billingCycle === 'annual' ? 365 : 30) * 24 * 60 * 60 * 1000
  ).toISOString();
  const now = new Date().toISOString();

  // Load existing subscription for this user or order
  const { data: byOrder } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('razorpay_order_id', orderId)
    .maybeSingle();

  const { data: byUser } = byOrder
    ? { data: null }
    : await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

  const existing = byOrder || byUser;

  let subscriptionId: string | undefined;

  if (addonId && existing) {
    // Credit top-up on existing subscription
    const newRemaining = (existing.credits_remaining || 0) + credits;
    const newTotal = (existing.credits_total || 0) + credits;
    const { data: updated, error } = await supabase
      .from('subscriptions')
      .update({
        credits_remaining: newRemaining,
        credits_total: newTotal,
        razorpay_payment_id: paymentId,
        razorpay_order_id: orderId,
        updated_at: now,
      })
      .eq('id', existing.id)
      .select('id')
      .single();

    if (error) return { ok: false, error: error.message };
    subscriptionId = updated.id;
  } else {
    const payload = {
      user_id: userId,
      plan_id: resolvedPlanId,
      plan_name: resolvedPlanName,
      status: 'active',
      billing_cycle: billingCycle,
      price_inr: priceInr,
      credits_total: credits,
      credits_remaining: credits,
      credits_used: 0,
      overage_rate_paise: overagePaise,
      current_period_start: now,
      current_period_end: periodEnd,
      renewal_date: periodEnd,
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      updated_at: now,
      cancel_at_period_end: false,
      cancelled_at: null,
    };

    if (existing) {
      const { data: updated, error } = await supabase
        .from('subscriptions')
        .update(payload)
        .eq('id', existing.id)
        .select('id')
        .single();
      if (error) return { ok: false, error: error.message };
      subscriptionId = updated.id;
    } else {
      const { data: created, error } = await supabase
        .from('subscriptions')
        .insert(payload)
        .select('id')
        .single();
      if (error) return { ok: false, error: error.message };
      subscriptionId = created.id;
    }
  }

  // Invoice
  const invNum = `INV${Date.now()}`;
  await supabase.from('billing_invoices').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    invoice_number: invNum,
    invoice_type: addonId ? 'credit_topup' : 'subscription',
    status: 'paid',
    amount_inr: priceInr,
    total_amount_inr: priceInr,
    credits_included: credits,
    billing_period_start: now,
    billing_period_end: periodEnd,
    paid_at: now,
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
  });

  // Clear pending retries
  await supabase
    .from('payment_retry_log')
    .update({ status: 'resolved', resolved_at: now })
    .eq('original_order_id', orderId)
    .eq('status', 'pending');

  // Email alert (best-effort)
  await supabase.from('subscription_email_alerts').insert({
    user_id: userId,
    alert_type: addonId ? 'credits_purchased' : 'subscription_activated',
    metadata: {
      plan: resolvedPlanName,
      amount: priceInr,
      credits,
      order_id: orderId,
      payment_id: paymentId,
    },
  });

  return { ok: true, subscriptionId };
}
