import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, parseIntSafe } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';
import { consumeToken, TOKEN_BUCKET_CONFIGS, rateLimitedResponse, getUserKey } from '@/lib/security/tokenBucket';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    // Per-user token bucket rate limiting for notifications
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const key = getUserKey(user.id, ip, 'notifications-get');
    const rl = consumeToken(key, TOKEN_BUCKET_CONFIGS.NOTIFICATIONS);
    if (!rl.allowed) return rateLimitedResponse(rl, 'notifications');

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';
    const type = searchParams.get('type');
    const limit = parseIntSafe(searchParams.get('limit'), 50, 1, 100);

    const ALLOWED_TYPES = ['interview_scheduled', 'assessment_assigned', 'shortlisted', 'offer_accepted', 'task_due', 'score_ready'] as const;
    if (type && !ALLOWED_TYPES.includes(type as any)) {
      return badRequestResponse('Invalid notification type');
    }

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id) // always scope to authenticated user
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) query = query.eq('is_read', false);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) return secureJson({ error: 'Failed to fetch notifications' }, 500);

    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    return secureJson({ data: data || [], unreadCount: unreadCount || 0 });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: any;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const type = sanitizeString(body.type);
    const title = sanitizeString(body.title);
    const message = sanitizeString(body.message);
    const action_url = body.action_url ? sanitizeString(body.action_url).slice(0, 500) : null;
    // user_id is always the authenticated user — prevent privilege escalation
    const target_user_id = body.user_id ? sanitizeString(body.user_id) : user.id;

    if (!type || !title || !message) {
      return badRequestResponse('type, title, and message are required');
    }
    if (title.length > 200) return badRequestResponse('title is too long');
    if (message.length > 1000) return badRequestResponse('message is too long');

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        user_id: target_user_id,
        type,
        title,
        message,
        is_read: false,
        action_url,
        metadata: typeof body.metadata === 'object' && body.metadata !== null ? body.metadata : {},
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create notification' }, 500);
    return secureJson({ data }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
