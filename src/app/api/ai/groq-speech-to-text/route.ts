import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { requireAuthenticatedUser } from '@/lib/security/apiHelpers';

function logApiFailure(provider: string, errorCode: string | number, errorMessage: string, context: Record<string, unknown>) {
  console.error(
    `[API-FAILURE] ${new Date().toISOString()} | provider=${provider} | errorCode=${errorCode} | error="${errorMessage}" | context=${JSON.stringify(context)}`
  );
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  const requestContext = {
    path: '/api/ai/groq-speech-to-text',
    method: 'POST',
    userAgent: (request.headers.get('user-agent') || 'unknown').slice(0, 80),
  };

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      logApiFailure('groq', 'KEY_MISSING', 'GROQ_API_KEY is not configured', requestContext);
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured', details: 'Add GROQ_API_KEY to your environment variables' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const fileEntry = formData.get('file');
    const language = formData.get('language')?.toString() || 'en';

    if (!(fileEntry instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required field: file', details: 'Expected multipart/form-data with a named File part' },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    const result = await groq.audio.transcriptions.create({
      file: fileEntry,
      model: 'whisper-large-v3-turbo',
      language,
      response_format: 'json',
    });

    return NextResponse.json({ text: result.text });
  } catch (error) {
    const statusCode = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : String(error);
    logApiFailure('groq', statusCode, message, requestContext);
    return NextResponse.json(
      { error: `Groq STT error: ${statusCode}`, details: message },
      { status: statusCode }
    );
  }
}
