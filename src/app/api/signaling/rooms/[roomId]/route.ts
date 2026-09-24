/**
 * GET /api/signaling/rooms/[roomId]
 * Proxy to the dedicated signaling server for room metadata.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRoomInfo, isSignalingServerConfigured } from '@/lib/signaling/signalingServer';

export async function GET(
  _req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  if (!isSignalingServerConfigured()) {
    return NextResponse.json(
      { error: 'Signaling server not configured' },
      { status: 503 }
    );
  }

  const info = await getRoomInfo(params.roomId);
  if (!info) {
    return NextResponse.json({ error: 'Room not found or signaling server unreachable' }, { status: 404 });
  }

  return NextResponse.json(info);
}
