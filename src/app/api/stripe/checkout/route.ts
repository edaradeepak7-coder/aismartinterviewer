'use server';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

// B2C Plan price map (USD cents) — replace with real Stripe Price IDs after creating products
const PLAN_PRICES: Record<string, { monthly: number; annual: number; name: string }> = {
  starter: { monthly: 699, annual: 5588, name: 'Starter Plan' },
  growth: { monthly: 1399, annual: 11188, name: 'Growth Plan' },
  professional: { monthly: 2799, annual: 22388, name: 'Professional Plan' },
};

const CREDIT_PRICES: Record<string, { amount: number; name: string }> = {
  'addon-5': { amount: 299, name: '5 Session Credits' },
  'addon-15': { amount: 699, name: '15 Session Credits (+2 bonus)' },
  'addon-30': { amount: 1299, name: '30 Session Credits (+5 bonus)' },
  'addon-60': { amount: 1999, name: '60 Session Credits (+12 bonus)' },
};

export async function POST(request: NextRequest) {
  try {
    const { planId, billingCycle = 'monthly', addonId, customerEmail, mode = 'payment' } = await request.json();

    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    let sessionMode: Stripe.Checkout.SessionCreateParams.Mode = mode;

    if (planId && PLAN_PRICES[planId]) {
      const plan = PLAN_PRICES[planId];
      const amount = billingCycle === 'annual' ? plan.annual : plan.monthly;
      const interval = billingCycle === 'annual' ? 'year' : 'month';

      if (sessionMode === 'subscription') {
        // For subscriptions, create price inline
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: plan.name,
              description: `Triveda AI Interview Platform — ${plan.name}`,
            },
            unit_amount: amount,
            recurring: { interval },
          },
          quantity: 1,
        }];
      } else {
        lineItems = [{
          price_data: {
            currency: 'usd',
            product_data: { name: plan.name },
            unit_amount: amount,
          },
          quantity: 1,
        }];
      }
    } else if (addonId && CREDIT_PRICES[addonId]) {
      const addon = CREDIT_PRICES[addonId];
      sessionMode = 'payment';
      lineItems = [{
        price_data: {
          currency: 'usd',
          product_data: { name: addon.name },
          unit_amount: addon.amount,
        },
        quantity: 1,
      }];
    } else {
      return NextResponse.json({ success: false, error: 'Invalid plan or addon ID' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      mode: sessionMode,
      line_items: lineItems,
      success_url: `${SITE_URL}/pricing?stripe_success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/pricing?stripe_cancel=1`,
      customer_email: customerEmail || undefined,
      metadata: {
        planId: planId || '',
        addonId: addonId || '',
        billingCycle,
        source: 'triveda_b2c',
      },
      payment_method_types: ['card'],
    });

    return NextResponse.json({ success: true, url: session.url, sessionId: session.id });
  } catch (error: any) {
    console.error('[Stripe Checkout] Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Stripe checkout failed' }, { status: 500 });
  }
}
