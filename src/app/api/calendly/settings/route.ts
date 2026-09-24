import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString } from '@/lib/security/sanitize';
import {
  secureJson,
  unauthorizedResponse,
  badRequestResponse,
  forbiddenResponse,
} from '@/lib/security/apiHelpers';
import { getDefaultSchedulingUrl } from '@/lib/calendly/server';

const RECRUITER_ROLES = new Set(['recruiter', 'org_admin', 'admin', 'super_admin']);

/**
 * GET /api/calendly/settings
 */
export async function GET() {
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

    const { data, error } = await supabase
      .from('recruiter_calendly_settings')
      .select('scheduling_url, user_uri, default_event_url, updated_at')
      .eq('recruiter_id', user.id)
      .maybeSingle();

    if (error && /recruiter_calendly_settings|PGRST205|42P01/i.test(error.message)) {
      return secureJson({
        data: {
          scheduling_url: getDefaultSchedulingUrl(),
          user_uri: null,
          default_event_url: null,
          configured: false,
          missingTable: true,
        },
      });
    }
    if (error) return secureJson({ error: error.message }, 500);

    const scheduling_url = data?.scheduling_url || getDefaultSchedulingUrl();
    return secureJson({
      data: {
        scheduling_url,
        user_uri: data?.user_uri || null,
        default_event_url: data?.default_event_url || null,
        configured: Boolean(data?.scheduling_url),
        updated_at: data?.updated_at || null,
      },
    });
  } catch (err) {
    console.error('calendly settings GET:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/**
 * PUT /api/calendly/settings
 * Body: { scheduling_url, user_uri?, default_event_url? }
 */
export async function PUT(request: NextRequest) {
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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const scheduling_url = sanitizeString(String(body.scheduling_url ?? '')).slice(0, 500);
    if (!scheduling_url || !/^https:\/\/calendly\.com\//i.test(scheduling_url)) {
      return badRequestResponse('scheduling_url must be an https://calendly.com/... link');
    }
    const user_uri = body.user_uri
      ? sanitizeString(String(body.user_uri)).slice(0, 500)
      : null;
    const default_event_url = body.default_event_url
      ? sanitizeString(String(body.default_event_url)).slice(0, 500)
      : null;

    if (user_uri && !user_uri.startsWith('https://api.calendly.com/users/')) {
      return badRequestResponse('user_uri must be a Calendly API users URI');
    }

    const row = {
      recruiter_id: user.id,
      scheduling_url,
      user_uri: user_uri || null,
      default_event_url: default_event_url || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('recruiter_calendly_settings')
      .upsert(row, { onConflict: 'recruiter_id' })
      .select('scheduling_url, user_uri, default_event_url, updated_at')
      .single();

    if (error) {
      if (/recruiter_calendly_settings|PGRST205|42P01/i.test(error.message)) {
        return secureJson(
          {
            error:
              'Apply migration 20260923160000_calendly_booking_loop.sql before saving settings',
          },
          503,
        );
      }
      return secureJson({ error: error.message }, 500);
    }

    return secureJson({ data: { ...data, configured: true } });
  } catch (err) {
    console.error('calendly settings PUT:', err);
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
