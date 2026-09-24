import { NextRequest, NextResponse } from 'next/server';
import { validateApiKeys } from '@/lib/apiKeyValidator';
import { requireAuthenticatedUser } from '@/lib/security/apiHelpers';

/**
 * GET /api/ai/validate-keys
 * Validates GROQ_API_KEY and OPENAI_API_KEY, logs results with timestamps and error codes.
 * Called on server startup or health checks.
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuthenticatedUser();
  if (auth.error) return auth.error;

  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  const context = {
    trigger: 'manual_check',
    userAgent: userAgent.slice(0, 80),
    ip,
    requestedAt: new Date().toISOString(),
  };

  const results = await validateApiKeys(context);

  const summary = results.map(r => ({
    provider: r.provider,
    valid: r.valid,
    latencyMs: r.latencyMs,
    errorCode: r.errorCode,
    errorMessage: r.errorMessage,
    timestamp: r.timestamp,
  }));

  const allValid = results.every(r => r.valid);

  return NextResponse.json(
    { status: allValid ? 'ok' : 'degraded', results: summary },
    { status: allValid ? 200 : 207 }
  );
}
