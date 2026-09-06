import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

// ─── Exponential backoff retry delays (in hours) ──────────────────────────────
const RETRY_DELAYS_HOURS = [1, 4, 24, 72]; // 1h, 4h, 24h, 72h

async function scheduleRetry(
  supabase: Awaited<ReturnType<typeof createClient>>,
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
    if (!webhookSecret) {
      // Fail closed in production — do not process without secret
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    // ── Signature validation (timing-safe) ────────────────────────────────────
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
      // Buffer length mismatch — invalid signature
      isValid = false;
    }

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
    }

    const event = JSON.parse(body);
    const eventType: string = event.event;
    const supabase = await createClient();

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        if (!payment) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_order_id', payment.order_id)
          .maybeSingle();

        if (sub) {
          await supabase.from('subscriptions').update({
            status: 'active',
            razorpay_payment_id: payment.id,
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);

          await supabase.from('billing_invoices').update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            razorpay_payment_id: payment.id,
          }).eq('razorpay_order_id', payment.order_id);

          // Clear any pending retry logs for this order
          await supabase.from('payment_retry_log')
            .update({ status: 'resolved', resolved_at: new Date().toISOString() })
            .eq('original_order_id', payment.order_id)
            .eq('status', 'pending');

          // Log subscription activation email alert
          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_activated',
            metadata: { plan: sub.plan_name, amount: payment.amount / 100 },
          });
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
          await supabase.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);

          // Check existing retry count
          const { data: existingRetries } = await supabase
            .from('payment_retry_log')
            .select('retry_attempt')
            .eq('original_order_id', payment.order_id)
            .order('retry_attempt', { ascending: false })
            .limit(1);

          const nextAttempt = existingRetries && existingRetries.length > 0
            ? existingRetries[0].retry_attempt + 1
            : 1;

          const errorMsg = payment.error_description || payment.error_code || 'Payment failed';

          // Determine fallback method
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

          // Log failed payment retry email alert
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

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_order_id', order.id)
          .maybeSingle();

        if (sub) {
          const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('subscriptions').update({
            status: 'active',
            credits_remaining: sub.credits_total,
            credits_used: 0,
            current_period_start: new Date().toISOString(),
            current_period_end: nextRenewal,
            renewal_date: nextRenewal,
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);

          const invNum = `INV${Date.now()}`;
          await supabase.from('billing_invoices').insert({
            user_id: sub.user_id,
            subscription_id: sub.id,
            invoice_number: invNum,
            invoice_type: 'subscription',
            status: 'paid',
            amount_inr: sub.price_inr,
            total_amount_inr: sub.price_inr,
            credits_included: sub.credits_total,
            billing_period_start: new Date().toISOString(),
            billing_period_end: nextRenewal,
            paid_at: new Date().toISOString(),
            razorpay_order_id: order.id,
          });

          // Log renewal email alert
          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_renewed',
            metadata: { plan: sub.plan_name, next_renewal: nextRenewal },
          });
        }
        break;
      }

      case 'refund.created': {
        const refund = event.payload?.refund?.entity;
        if (!refund) break;

        const invNum = `REF${Date.now()}`;
        await supabase.from('billing_invoices').insert({
          invoice_number: invNum,
          invoice_type: 'prorated_refund',
          status: 'paid',
          amount_inr: -(refund.amount / 100),
          total_amount_inr: -(refund.amount / 100),
          razorpay_payment_id: refund.payment_id,
          notes: `Refund processed`,
        });
        break;
      }

      case 'subscription.charged': {
        const sub_entity = event.payload?.subscription?.entity;
        if (!sub_entity) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', sub_entity.id)
          .maybeSingle();

        if (sub) {
          const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('subscriptions').update({
            status: 'active',
            credits_remaining: sub.credits_total,
            credits_used: 0,
            renewal_date: nextRenewal,
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);

          // Log renewal email alert
          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_renewed',
            metadata: { plan: sub.plan_name },
          });
        }
        break;
      }

      case 'subscription.cancelled': {
        const sub_entity = event.payload?.subscription?.entity;
        if (!sub_entity) break;

        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('razorpay_subscription_id', sub_entity.id)
          .maybeSingle();

        if (sub) {
          const retainUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          await supabase.from('subscriptions').update({
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancel_at_period_end: true,
            data_retain_until: retainUntil,
            updated_at: new Date().toISOString(),
          }).eq('id', sub.id);

          // Log cancellation email alert
          await supabase.from('subscription_email_alerts').insert({
            user_id: sub.user_id,
            alert_type: 'subscription_cancelled',
            metadata: { plan: sub.plan_name, data_retain_until: retainUntil },
          });
        }
        break;
      }

      default:
        // Unhandled event — acknowledge receipt
        break;
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
