import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  secureJson,
  unauthorizedResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import {
  fetchCalendlyScheduledEvents,
  getDefaultCalendlyUserUri,
  getCalendlyAccessToken,
} from '@/lib/calendly/server';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

/**
 * GET /api/calendly/scheduled-events
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (!profile || !RECRUITER_ROLES.has(profile.role)) return forbiddenResponse();

    if (!getCalendlyAccessToken()) {
      return secureJson({ data: [], error: 'CALENDLY_ACCESS_TOKEN not configured' });
    }

    const { data: settings } = await supabase
      .from('recruiter_calendly_settings')
      .select('user_uri')
      .eq('recruiter_id', user.id)
      .maybeSingle();

    const userUri = settings?.user_uri || getDefaultCalendlyUserUri();
    if (!userUri) {
      return secureJson({
        data: [],
        hint: 'Save Calendly user_uri in settings to list upcoming sessions.',
      });
    }

    const { events, error } = await fetchCalendlyScheduledEvents(userUri);
    return secureJson({ data: events, error: error || null });
  } catch (err) {
    console.error('calendly scheduled-events:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
