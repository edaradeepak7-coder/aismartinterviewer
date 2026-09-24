import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import {
  fetchCalendlyEventTypes,
  fetchCalendlyScheduledEvents,
  getDefaultCalendlyUserUri,
  getDefaultSchedulingUrl,
  getCalendlyAccessToken,
} from '@/lib/calendly/server';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

async function resolveUserUri() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: unauthorizedResponse() as Response };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !RECRUITER_ROLES.has(profile.role)) {
    return { error: forbiddenResponse() as Response };
  }

  const { data: settings } = await supabase
    .from('recruiter_calendly_settings')
    .select('user_uri, scheduling_url, default_event_url')
    .eq('recruiter_id', user.id)
    .maybeSingle();

  const userUri = settings?.user_uri || getDefaultCalendlyUserUri();
  return {
    supabase,
    user,
    userUri,
    schedulingUrl: settings?.scheduling_url || getDefaultSchedulingUrl(),
    defaultEventUrl: settings?.default_event_url || null,
  };
}

/**
 * GET /api/calendly/event-types
 * Proxies Calendly event types (server token).
 */
export async function GET(_request: NextRequest) {
  try {
    if (!getCalendlyAccessToken()) {
      return secureJson(
        {
          data: [],
          error: 'CALENDLY_ACCESS_TOKEN not configured',
          fallback_url: getDefaultSchedulingUrl(),
        },
        200,
      );
    }

    const resolved = await resolveUserUri();
    if ('error' in resolved && resolved.error) return resolved.error;
    const { userUri, schedulingUrl, defaultEventUrl } = resolved as {
      userUri: string | null;
      schedulingUrl: string;
      defaultEventUrl: string | null;
    };

    if (!userUri) {
      return secureJson({
        data: defaultEventUrl
          ? [
              {
                uri: 'local-default',
                name: 'Default event',
                scheduling_url: defaultEventUrl,
                duration: 30,
                color: '#00C9B1',
                active: true,
              },
            ]
          : [],
        fallback_url: schedulingUrl,
        hint: 'Save your Calendly user_uri in settings (or set CALENDLY_USER_URI) to list event types.',
      });
    }

    const { types, error } = await fetchCalendlyEventTypes(userUri);
    return secureJson({
      data: types,
      error: error || null,
      fallback_url: defaultEventUrl || schedulingUrl,
    });
  } catch (err) {
    console.error('calendly event-types:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
