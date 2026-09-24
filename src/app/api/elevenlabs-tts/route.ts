import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/lib/security/apiHelpers';

// Indian English voice IDs from ElevenLabs (3 female + 3 male)
// Each interview randomly picks one voice and keeps it for the session.
const INDIAN_VOICES = {
  female: [
    { id: 'O0HDGZKCNpSHnOXD6aq6', name: 'Kavya' },
    { id: 'tm4rC0Q4St1T4Nq6wyLZ', name: 'Ananya' },
    { id: 'z8KYiNHfPR756XyDo3ZY', name: 'Noorie' },
  ],
  male: [
    { id: 'uXyz4TK9DrupDXnf2LE4', name: 'Siddharth' },
    { id: 'jTTfIxmppkp2m2wYhssT', name: 'Karthik' },
    { id: 'SQ8WYwlpzxrTbbuJgi38', name: 'Neel' },
  ],
};

export async function POST(req: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  try {
    let body: { text?: string; voiceGender?: string; voiceIndex?: number } = {};
    try {
      body = await req.json();
    } catch {
      // Aborted/empty client requests (e.g. superseded speech) — ignore quietly
      return new NextResponse(null, { status: 499 });
    }

    const { text, voiceGender = 'male', voiceIndex = 0 } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    // Prefer server-only key; fall back to legacy public env during migration
    const apiKey =
      process.env.ELEVENLABS_API_KEY || process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'ElevenLabs API key not configured' }, { status: 500 });
    }

    const voices = voiceGender === 'female' ? INDIAN_VOICES.female : INDIAN_VOICES.male;
    const voice = voices[voiceIndex % voices.length];

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voice.id}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.80,
            style: 0.15,
            use_speaker_boost: true,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error('ElevenLabs TTS error:', response.status, errText);
      return NextResponse.json(
        { error: `ElevenLabs API error: ${response.status}` },
        { status: response.status }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
        'X-Voice-Name': voice.name,
        'X-Voice-Gender': voiceGender,
      },
    });
  } catch (err: any) {
    console.error('TTS route error:', err?.message ?? err);
    return NextResponse.json({ error: 'TTS failed' }, { status: 500 });
  }
}
