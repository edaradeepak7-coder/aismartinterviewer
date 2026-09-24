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
    path: '/api/ai/groq-chat-completion',
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

    const body = await request.json();
    const { model = 'llama-3.3-70b-versatile', messages, stream = false, parameters = {} } = body;

    if (!messages?.length) {
      return NextResponse.json(
        { error: 'Missing required field: messages', details: 'Request validation failed' },
        { status: 400 }
      );
    }

    const groq = new Groq({ apiKey });

    if (stream) {
      const groqStream = await groq.chat.completions.create({
        model,
        messages,
        temperature: parameters.temperature ?? 0.7,
        max_tokens: parameters.max_tokens ?? 1024,
        stream: true,
      });

      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));
            for await (const chunk of groqStream) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'chunk', chunk })}\n\n`));
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
            controller.close();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            const code = (error as any)?.status || 'STREAM_ERROR';
            logApiFailure('groq', code, message, { ...requestContext, model, stream: true });
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'Groq streaming error', details: message })}\n\n`));
            controller.close();
          }
        },
      });

      return new NextResponse(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature: parameters.temperature ?? 0.7,
      max_tokens: parameters.max_tokens ?? 1024,
      stream: false,
    });

    return NextResponse.json({
      choices: response.choices,
      usage: response.usage,
      model: response.model,
    });
  } catch (error) {
    const statusCode = (error as any)?.status || 500;
    const message = error instanceof Error ? error.message : String(error);
    logApiFailure('groq', statusCode, message, requestContext);
    return NextResponse.json(
      { error: `Groq chat error: ${statusCode}`, details: message },
      { status: statusCode }
    );
  }
}
