import { NextResponse } from 'next/server';

/**
 * Stripe checkout is disabled — use Razorpay (`/api/razorpay/order`).
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Stripe is disabled. Please use Razorpay checkout.',
      provider: 'razorpay',
      orderEndpoint: '/api/razorpay/order',
    },
    { status: 503 }
  );
}
