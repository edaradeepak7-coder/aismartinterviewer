import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

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

    switch (eventType) {
      case 'payment.captured': {
        const payment = event.payload?.payment?.entity;
        console.log('Payment captured:', {
          paymentId: payment?.id,
          orderId: payment?.order_id,
          amount: payment?.amount,
          currency: payment?.currency,
          status: payment?.status,
        });
        // TODO: Update subscription status in database
        break;
      }

      case 'payment.failed': {
        const payment = event.payload?.payment?.entity;
        console.log('Payment failed:', {
          paymentId: payment?.id,
          orderId: payment?.order_id,
          errorCode: payment?.error_code,
          errorDescription: payment?.error_description,
        });
        // TODO: Handle failed payment — notify user, update order status
        break;
      }

      case 'order.paid': {
        const order = event.payload?.order?.entity;
        console.log('Order paid:', {
          orderId: order?.id,
          amount: order?.amount,
          receipt: order?.receipt,
        });
        // TODO: Activate subscription, credit sessions
        break;
      }

      case 'refund.created': {
        const refund = event.payload?.refund?.entity;
        console.log('Refund created:', {
          refundId: refund?.id,
          paymentId: refund?.payment_id,
          amount: refund?.amount,
        });
        // TODO: Update subscription/credit balance on refund
        break;
      }

      default:
        console.log('Unhandled Razorpay webhook event:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
