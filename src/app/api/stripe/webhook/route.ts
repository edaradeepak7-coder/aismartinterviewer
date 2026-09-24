import { NextResponse } from 'next/server';

/**
 * Stripe webhooks are disabled — configure Razorpay webhooks at `/api/razorpay/webhook`.
 */
export async function POST() {
  return NextResponse.json(
    {
      received: false,
      error: 'Stripe webhooks are disabled. Use Razorpay.',
      provider: 'razorpay',
      webhookEndpoint: '/api/razorpay/webhook',
    },
    { status: 503 }
  );
}
