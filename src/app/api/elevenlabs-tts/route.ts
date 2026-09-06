import { NextRequest, NextResponse } from 'next/server';

// Indian English voice IDs from ElevenLabs
const INDIAN_VOICES = {
  female: [
    { id: 'O0HDGZKCNpSHnOXD6aq6', name: 'Kavya' },
    { id: 'tm4rC0Q4St1T4Nq6wyLZ', name: 'Ananya' },
    { id: 'pIhyYpeIfZjcBDvduSln', name: 'Veda' },
  ],
  male: [
    { id: 'uXyz4TK9DrupDXnf2LE4', name: 'Siddharth' },
    { id: 'hEVeuEwuN5rfDgwQ85v8', name: 'Arjun' },
    { id: 'jTTfIxmppkp2m2wYhssT', name: 'Karthik' },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, voiceGender = 'male', voiceIndex = 0 } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
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
    console.error('TTS route error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
