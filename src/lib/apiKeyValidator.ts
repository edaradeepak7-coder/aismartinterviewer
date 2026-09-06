/**
 * API Key Validator — validates GROQ_API_KEY and OPENAI_API_KEY on startup
 * Logs failures with timestamps, error codes, and user context.
 * Server-side only (Node.js runtime).
 */

export interface ApiValidationResult {
  provider: 'groq' | 'openai';
  valid: boolean;
  latencyMs?: number;
  errorCode?: string | number;
  errorMessage?: string;
  timestamp: string;
}

export interface ApiValidationLog {
  timestamp: string;
  provider: string;
  status: 'ok' | 'fail' | 'missing';
  latencyMs?: number;
  errorCode?: string | number;
  errorMessage?: string;
  context?: Record<string, unknown>;
}

function logApiEvent(log: ApiValidationLog) {
  const prefix = log.status === 'ok' ? '✅' : log.status === 'missing' ? '⚠️' : '❌';
  const base = `[API-VALIDATOR] ${prefix} ${log.timestamp} | provider=${log.provider} | status=${log.status}`;
  const extra = [
    log.latencyMs !== undefined ? `latency=${log.latencyMs}ms` : null,
    log.errorCode !== undefined ? `errorCode=${log.errorCode}` : null,
    log.errorMessage ? `error="${log.errorMessage}"` : null,
    log.context ? `context=${JSON.stringify(log.context)}` : null,
  ].filter(Boolean).join(' | ');

  if (log.status === 'ok') {
    console.log(`${base}${extra ? ' | ' + extra : ''}`);
  } else {
    console.error(`${base}${extra ? ' | ' + extra : ''}`);
  }
}

async function validateGroqKey(context?: Record<string, unknown>): Promise<ApiValidationResult> {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey || apiKey.startsWith('your-')) {
    logApiEvent({ timestamp, provider: 'groq', status: 'missing', errorMessage: 'GROQ_API_KEY not set or is placeholder', context });
    return { provider: 'groq', valid: false, errorCode: 'KEY_MISSING', errorMessage: 'GROQ_API_KEY not configured', timestamp };
  }

  const start = Date.now();
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage = body?.error?.message || res.statusText;
      logApiEvent({ timestamp, provider: 'groq', status: 'fail', latencyMs, errorCode: res.status, errorMessage, context });
      return { provider: 'groq', valid: false, latencyMs, errorCode: res.status, errorMessage, timestamp };
    }

    logApiEvent({ timestamp, provider: 'groq', status: 'ok', latencyMs, context });
    return { provider: 'groq', valid: true, latencyMs, timestamp };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const errorMessage = err?.message || String(err);
    const errorCode = err?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    logApiEvent({ timestamp, provider: 'groq', status: 'fail', latencyMs, errorCode, errorMessage, context });
    return { provider: 'groq', valid: false, latencyMs, errorCode, errorMessage, timestamp };
  }
}

async function validateOpenAIKey(context?: Record<string, unknown>): Promise<ApiValidationResult> {
  const timestamp = new Date().toISOString();
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || apiKey.startsWith('your-')) {
    logApiEvent({ timestamp, provider: 'openai', status: 'missing', errorMessage: 'OPENAI_API_KEY not set or is placeholder', context });
    return { provider: 'openai', valid: false, errorCode: 'KEY_MISSING', errorMessage: 'OPENAI_API_KEY not configured', timestamp };
  }

  const start = Date.now();
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const errorMessage = body?.error?.message || res.statusText;
      logApiEvent({ timestamp, provider: 'openai', status: 'fail', latencyMs, errorCode: res.status, errorMessage, context });
      return { provider: 'openai', valid: false, latencyMs, errorCode: res.status, errorMessage, timestamp };
    }

    logApiEvent({ timestamp, provider: 'openai', status: 'ok', latencyMs, context });
    return { provider: 'openai', valid: true, latencyMs, timestamp };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const errorMessage = err?.message || String(err);
    const errorCode = err?.name === 'TimeoutError' ? 'TIMEOUT' : 'NETWORK_ERROR';
    logApiEvent({ timestamp, provider: 'openai', status: 'fail', latencyMs, errorCode, errorMessage, context });
    return { provider: 'openai', valid: false, latencyMs, errorCode, errorMessage, timestamp };
  }
}

/**
 * Validates both GROQ and OpenAI API keys in parallel.
 * Call this from server-side startup code (e.g., API route instrumentation).
 */
export async function validateApiKeys(context?: Record<string, unknown>): Promise<ApiValidationResult[]> {
  const [groqResult, openaiResult] = await Promise.all([
    validateGroqKey(context),
    validateOpenAIKey(context),
  ]);
  return [groqResult, openaiResult];
}

/**
 * Lightweight check — only validates presence of keys (no network call).
 * Safe to call in middleware or edge runtime.
 */
export function checkApiKeyPresence(): { groq: boolean; openai: boolean } {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  return {
    groq: Boolean(groqKey && !groqKey.startsWith('your-')),
    openai: Boolean(openaiKey && !openaiKey.startsWith('your-')),
  };
}
