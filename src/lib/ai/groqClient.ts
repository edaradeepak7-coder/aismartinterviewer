import { csrfHeaders } from '@/lib/api/apiClient';

const GROQ_STT_ENDPOINT = '/api/ai/groq-speech-to-text';
const OPENAI_STT_ENDPOINT = '/api/ai/speech-to-text';

/**
 * Transcribe audio using Groq Whisper (primary) with OpenAI Whisper as fallback.
 */
export async function speechToTextGroq(
  file: Blob | File,
  language: string = 'en'
): Promise<{ text: string }> {
  // --- Primary: Groq Whisper ---
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', language);

    const response = await fetch(GROQ_STT_ENDPOINT, {
      method: 'POST',
      headers: csrfHeaders(),
      body: formData,
    });

    const data = await response.json();

    if (response.ok && !data.error && data.text) {
      return data;
    }

    console.warn('Groq STT failed, falling back to OpenAI:', data.error || 'Unknown error');
  } catch (err) {
    console.warn('Groq STT request error, falling back to OpenAI:', err);
  }

  // --- Fallback: OpenAI Whisper ---
  const fallbackFormData = new FormData();
  fallbackFormData.append('provider', 'OPEN_AI');
  fallbackFormData.append('model', 'whisper-1');
  fallbackFormData.append('parameters', JSON.stringify({ language }));
  fallbackFormData.append('file', file);

  const fallbackResponse = await fetch(OPENAI_STT_ENDPOINT, {
    method: 'POST',
    headers: csrfHeaders(),
    body: fallbackFormData,
  });

  const fallbackData = await fallbackResponse.json();

  if (!fallbackResponse.ok || fallbackData.error) {
    throw new Error(fallbackData.error || `Fallback STT failed: ${fallbackResponse.status}`);
  }

  return fallbackData;
}

/**
 * Chat completion using Groq LLM (primary) with OpenAI as fallback.
 */
export async function chatCompletionGroq(
  messages: object[],
  model: string = 'llama-3.3-70b-versatile',
  parameters: object = {}
): Promise<any> {
  // --- Primary: Groq ---
  try {
    const response = await fetch('/api/ai/groq-chat-completion', {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ model, messages, stream: false, parameters }),
    });

    const data = await response.json();

    if (response.ok && !data.error) {
      return data;
    }

    console.warn('Groq chat completion failed, falling back to OpenAI:', data.error || 'Unknown error');
  } catch (err) {
    console.warn('Groq chat completion request error, falling back to OpenAI:', err);
  }

  // --- Fallback: OpenAI ---
  const fallbackResponse = await fetch('/api/ai/chat-completion', {
    method: 'POST',
    headers: csrfHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ provider: 'OPEN_AI', model: 'gpt-4o-mini', messages, stream: false, parameters }),
  });

  const fallbackData = await fallbackResponse.json();

  if (!fallbackResponse.ok || fallbackData.error) {
    throw new Error(fallbackData.error || `Fallback chat completion failed: ${fallbackResponse.status}`);
  }

  return fallbackData;
}
