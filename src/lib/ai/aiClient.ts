import { csrfHeaders } from '@/lib/api/apiClient';

export async function callAIEndpoint(endpoint: string, payload: object) {
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: csrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.warn('API Route Error:', {
        error: data.error,
        details: data.details,
        status: response.status,
      });
      throw new Error(data.error || `Request failed: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.warn('API request error:', error);
    throw error;
  }
}
