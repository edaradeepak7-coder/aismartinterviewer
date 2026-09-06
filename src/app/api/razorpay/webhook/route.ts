import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping webhook validation');
      return NextResponse.json({ received: true });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    const isValid = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );

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

        // Find subscription by order ID and activate it
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

          // Mark invoice as paid
          await supabase.from('billing_invoices').update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            razorpay_payment_id: payment.id,
          }).eq('razorpay_order_id', payment.order_id);
        }
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        if (!payment) break;

        // Mark subscription as past_due
        await supabase.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('razorpay_order_id', payment.order_id);
        break;
      }

      case 'order.paid': {
        const order = event.payload?.order?.entity;
        if (!order) break;

        // Reset credits on renewal
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

          // Generate renewal invoice
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
        }
        break;
      }

      case 'refund.created': {
        const refund = event.payload?.refund?.entity;
        if (!refund) break;

        // Log refund as a void invoice
        const invNum = `REF${Date.now()}`;
        await supabase.from('billing_invoices').insert({
          invoice_number: invNum,
          invoice_type: 'prorated_refund',
          status: 'paid',
          amount_inr: -(refund.amount / 100),
          total_amount_inr: -(refund.amount / 100),
          razorpay_payment_id: refund.payment_id,
          notes: `Refund ID: ${refund.id}`,
        }).select();
        break;
      }

      case 'subscription.charged': {
        // Auto-renewal: reset credits
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
        }
        break;
      }

      default:
        console.log('Unhandled webhook event:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
