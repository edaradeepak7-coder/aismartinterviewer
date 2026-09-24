import { NextResponse } from 'next/server';

/** Lightweight connectivity probe for pre-interview network checks. */
export async function GET() {
  return NextResponse.json(
    { ok: true, t: Date.now() },
    {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    }
  );
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  });
}
