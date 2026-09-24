/**
 * POST /api/signaling/rooms
 * Proxy to the dedicated signaling server for room creation.
 * Keeps the signaling server API key server-side only.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createRoom, isSignalingServerConfigured } from '@/lib/signaling/signalingServer';

export async function POST(req: NextRequest) {
  if (!isSignalingServerConfigured()) {
    return NextResponse.json(
      { error: 'Signaling server not configured. Set NEXT_PUBLIC_SIGNALING_SERVER_URL.' },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const { roomId, metadata } = body as { roomId: string; metadata?: Record<string, unknown> };

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const created = await createRoom(roomId, metadata);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create room on signaling server' }, { status: 502 });
    }

    return NextResponse.json({ roomId, created: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
