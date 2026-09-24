/**
 * Server-side Calendly helpers (token never exposed to the client).
 */

export type CalendlyEventType = {
  uri: string;
  name: string;
  scheduling_url: string;
  duration: number;
  color: string;
  active: boolean;
  slug?: string;
};

export type CalendlyScheduledEvent = {
  uri: string;
  name: string;
  start_time: string;
  end_time: string;
  status: string;
  event_type?: string;
  invitees_counter?: { total: number; active: number; limit: number };
};

export function getCalendlyAccessToken(): string | null {
  const token =
    process.env.CALENDLY_ACCESS_TOKEN?.trim() ||
    process.env.NEXT_PUBLIC_CALENDLY_ACCESS_TOKEN?.trim() ||
    '';
  if (!token || token.startsWith('your-')) return null;
  return token;
}

export function getDefaultCalendlyUserUri(): string | null {
  const uri = process.env.CALENDLY_USER_URI?.trim() || '';
  return uri || null;
}

export function getDefaultSchedulingUrl(): string {
  return (
    process.env.CALENDLY_DEFAULT_SCHEDULING_URL?.trim() ||
    'https://calendly.com'
  );
}

export async function calendlyFetch<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const token = getCalendlyAccessToken();
  if (!token) {
    return { ok: false, status: 503, error: 'CALENDLY_ACCESS_TOKEN not configured' };
  }
  const url = path.startsWith('http') ? path : `https://api.calendly.com${path}`;
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        (json as { message?: string; title?: string })?.message ||
        (json as { title?: string })?.title ||
        `Calendly API ${res.status}`;
      return { ok: false, status: res.status, error: msg };
    }
    return { ok: true, data: json as T };
  } catch (err) {
    return {
      ok: false,
      status: 502,
      error: err instanceof Error ? err.message : 'Calendly request failed',
    };
  }
}

export async function fetchCalendlyEventTypes(userUri: string): Promise<{
  types: CalendlyEventType[];
  error?: string;
}> {
  const result = await calendlyFetch<{ collection?: Array<Record<string, unknown>> }>(
    `/event_types?active=true&user=${encodeURIComponent(userUri)}`,
  );
  if (!result.ok) return { types: [], error: result.error };
  const types: CalendlyEventType[] = (result.data.collection || []).map((et) => ({
    uri: String(et.uri || ''),
    name: String(et.name || 'Event'),
    scheduling_url: String(et.scheduling_url || ''),
    duration: Number(et.duration) || 30,
    color: String(et.color || '#00C9B1'),
    active: Boolean(et.active),
    slug: et.slug ? String(et.slug) : undefined,
  }));
  return { types: types.filter((t) => t.uri && t.scheduling_url) };
}

export async function fetchCalendlyScheduledEvents(userUri: string): Promise<{
  events: CalendlyScheduledEvent[];
  error?: string;
}> {
  const now = new Date().toISOString();
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = await calendlyFetch<{ collection?: CalendlyScheduledEvent[] }>(
    `/scheduled_events?user=${encodeURIComponent(userUri)}&status=active&min_start_time=${encodeURIComponent(now)}&max_start_time=${encodeURIComponent(future)}&count=20&sort=start_time:asc`,
  );
  if (!result.ok) return { events: [], error: result.error };
  return { events: result.data.collection || [] };
}

export async function fetchCalendlyEvent(eventUri: string): Promise<{
  event: CalendlyScheduledEvent | null;
  error?: string;
}> {
  const result = await calendlyFetch<{ resource?: CalendlyScheduledEvent }>(eventUri);
  if (!result.ok) return { event: null, error: result.error };
  return { event: result.data.resource || null };
}

export function assertCalendlyWebhookAuth(request: Request): boolean {
  const secret =
    process.env.CALENDLY_WEBHOOK_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    '';
  if (!secret) {
    // Allow unsigned only in development when no secret configured
    return process.env.NODE_ENV !== 'production';
  }
  const header =
    request.headers.get('x-calendly-webhook-secret') ||
    request.headers.get('x-webhook-secret') ||
    '';
  if (header && header === secret) return true;
  const auth = request.headers.get('authorization') || '';
  if (auth.toLowerCase().startsWith('bearer ') && auth.slice(7).trim() === secret) {
    return true;
  }
  return false;
}
