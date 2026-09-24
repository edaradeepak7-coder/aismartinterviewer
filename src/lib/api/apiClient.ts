'use client';

/**
 * Centralized API client with automatic CSRF token injection.
 * All state-mutating requests (POST/PUT/PATCH/DELETE) automatically
 * include the X-CSRF-Token header read from the csrf_token cookie.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiClientOptions extends Omit<RequestInit, 'method' | 'body'> {
  body?: unknown;
}

/** Read CSRF token from cookie */
export function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/** Headers for state-mutating fetch calls (CSRF + optional extras) */
export function csrfHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const headers = { ...extra };
  const csrf = getCsrfToken();
  if (csrf) headers['x-csrf-token'] = csrf;
  return headers;
}

const MUTATING_METHODS: Set<HttpMethod> = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

async function request<T = unknown>(
  method: HttpMethod,
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> ?? {}),
  };

  // Inject CSRF token for state-mutating requests
  if (MUTATING_METHODS.has(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers['x-csrf-token'] = csrf;
  }

  const init: RequestInit = {
    ...options,
    method,
    headers,
  };

  if (options.body !== undefined) {
    init.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, init);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMessage = data?.error ?? errorMessage;
    } catch {}
    throw new Error(errorMessage);
  }

  // Handle empty responses (204 No Content)
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T = unknown>(url: string, options?: ApiClientOptions) =>
    request<T>('GET', url, options),
  post: <T = unknown>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('POST', url, { ...options, body }),
  put: <T = unknown>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('PUT', url, { ...options, body }),
  patch: <T = unknown>(url: string, body?: unknown, options?: ApiClientOptions) =>
    request<T>('PATCH', url, { ...options, body }),
  delete: <T = unknown>(url: string, options?: ApiClientOptions) =>
    request<T>('DELETE', url, options),
};

export default apiClient;
