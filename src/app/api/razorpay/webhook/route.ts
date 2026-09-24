import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { fulfillRazorpayPayment } from '@/lib/billing/fulfillRazorpayPayment';

const RETRY_DELAYS_HOURS = [1, 4, 24, 72];

async function scheduleRetry(
  supabase: ReturnType<typeof createServiceRoleClient>,
  userId: string | null,
  subscriptionId: string | null,
  orderId: string,
  attempt: number,
  errorMsg: string,
  fallbackMethod?: string
) {
  const delayHours = RETRY_DELAYS_HOURS[Math.min(attempt - 1, RETRY_DELAYS_HOURS.length - 1)];
  const nextRetryAt = new Date(Date.now() + delayHours * 3600 * 1000).toISOString();

  await supabase.from('payment_retry_log').insert({
    user_id: userId,
    subscription_id: subscriptionId,
    original_order_id: orderId,
    retry_attempt: attempt,
    next_retry_at: nextRetryAt,
    last_error: errorMsg,
    status: attempt > RETRY_DELAYS_HOURS.length ? 'failed' : 'pending',
    fallback_method: fallbackMethod || null,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret || webhookSecret.startsWith('your-')) {
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    let isValid = false;
    try {
      isValid = crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch {
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType: string = event.event;
    const supabase = createServiceRoleClient();

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (!payment) break;

        const notes = payment.notes || {};
        let userId = notes.user_id as string | undefined;
        let planId = notes.plan_id as string | undefined;
        let addonId = (notes.addon_id as string) || undefined;
        if (addonId === '') addonId = undefined;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_order_id', payment.order_id)
          .maybeSingle();

        if (!userId && sub?.user_id) userId = sub.user_id;
        if (!planId && sub?.plan_id) planId = sub.plan_id;

        if (userId) {
          await fulfillRazorpayPayment(supabase, {
            userId,
            orderId: payment.order_id,
            paymentId: payment.id,
            planId,
            addonId,
            planName: notes.plan_name || sub?.plan_name,
            priceInr: notes.price_inr ? Number(notes.price_inr) : sub?.price_inr,
            credits: notes.credits ? Number(notes.credits) : sub?.credits_total,
            billingCycle: notes.billing_cycle === 'annual' ? 'annual' : 'monthly',
          });
        } else if (sub) {
          // Fallback: mark paid without full fulfill metadata
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              razorpay_payment_id: payment.id,
              credits_remaining: sub.credits_total,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          await supabase
            .from('billing_invoices')
            .update({
              status: 'paid',
              paid_at: new Date().toISOString(),
              razorpay_payment_id: payment.id,
            })
            .eq('razorpay_order_id', payment.order_id);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (!payment) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_order_id', payment.order_id)
          .maybeSingle();

        if (sub) {
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          const { data: existingRetries } = await supabase
            .from('payment_retry_log')
            .select('retry_attempt')
            .eq('original_order_id', payment.order_id)
            .order('retry_attempt', { ascending: false })
            .limit(1);

          const nextAttempt =
            existingRetries && existingRetries.length > 0
              ? existingRetries[0].retry_attempt + 1
              : 1;

          const errorMsg = payment.error_description || payment.error_code || 'Payment failed';
          const fallback = payment.method === 'card' ? 'upi' : 'card';

          await scheduleRetry(
            supabase,
            sub.user_id,
            sub.id,
            payment.order_id,
            nextAttempt,
            errorMsg,
            nextAttempt > 1 ? fallback : undefined
          );

          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'payment_failed_retry',
            metadata: {
              attempt: nextAttempt,
              error: errorMsg,
              fallback_method: nextAttempt > 1 ? fallback : null,
            },
          });
        }
        break;
      }

      case 'order.paid': {
        const order = event.payload?.order?.entity;
        if (!order) break;

        const notes = order.notes || {};
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_order_id', order.id)
          .maybeSingle();

        const userId = (notes.user_id as string) || sub?.user_id;
        if (!userId) break;

        const paymentId =
          order.payments?.[0] ||
          sub?.razorpay_payment_id ||
          `order_paid_${order.id}`;

        await fulfillRazorpayPayment(supabase, {
          userId,
          orderId: order.id,
          paymentId: String(paymentId),
          planId: (notes.plan_id as string) || sub?.plan_id,
          addonId: notes.addon_id || undefined,
          planName: notes.plan_name || sub?.plan_name,
          priceInr: notes.price_inr ? Number(notes.price_inr) : sub?.price_inr,
          credits: notes.credits ? Number(notes.credits) : sub?.credits_total,
          billingCycle: notes.billing_cycle === 'annual' ? 'annual' : 'monthly',
        });
        break;
      }

      case 'refund.created': {
        const refund = event.payload?.refund?.entity;
        if (!refund) break;

        await supabase.from('billing_invoices').insert({
          invoice_number: `REF${Date.now()}`,
          invoice_type: 'prorated_refund',
          status: 'paid',
          amount_inr: -(refund.amount / 100),
          total_amount_inr: -(refund.amount / 100),
          razorpay_payment_id: refund.payment_id,
          notes: 'Refund processed via Razorpay',
        });
        break;
      }

      case 'subscription.charged': {
        const subEntity = event.payload?.subscription?.entity;
        if (!subEntity) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', subEntity.id)
          .maybeSingle();

        if (sub) {
          const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              credits_remaining: sub.credits_total,
              credits_used: 0,
              renewal_date: nextRenewal,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_renewed',
            metadata: { plan: sub.plan_name },
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        const subEntity = event.payload?.subscription?.entity;
        if (!subEntity) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', subEntity.id)
          .maybeSingle();

        if (sub) {
          const retainUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase
            .from('subscriptions')
            .update({
              status: 'cancelled',
              cancelled_at: new Date().toISOString(),
              cancel_at_period_end: true,
              data_retain_until: retainUntil,
              updated_at: new Date().toISOString(),
            })
            .eq('id', sub.id);

          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_cancelled',
            metadata: { plan: sub.plan_name, data_retain_until: retainUntil },
          });
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Razorpay Webhook] Error:', err);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
