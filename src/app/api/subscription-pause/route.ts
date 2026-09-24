import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sanitizeString, isValidUUID, parseIntSafe } from '@/lib/security/sanitize';
import { secureJson, unauthorizedResponse, badRequestResponse } from '@/lib/security/apiHelpers';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** GET — current subscription + pause history for auth user */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, plan_name, status, current_period_end, credits_remaining, credits_total')
      .eq('user_id', user.id)
      .in('status', ['active', 'paused', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let pauses: unknown[] = [];
    if (subscription?.id) {
      const { data: pauseData } = await supabase
        .from('subscription_pauses')
        .select('*')
        .eq('subscription_id', subscription.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      pauses = pauseData || [];
    } else {
      const { data: pauseData } = await supabase
        .from('subscription_pauses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      pauses = pauseData || [];
    }

    const activePause = (pauses as { status: string }[]).find((p) => p.status === 'active') || null;

    return secureJson({
      subscription: subscription || null,
      pauses,
      activePause,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/** POST — create a pause (1–3 months) */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const pauseMonths = parseIntSafe(String(body.pause_months ?? ''), 0, 1, 3);
    if (pauseMonths < 1 || pauseMonths > 3) {
      return badRequestResponse('pause_months must be 1, 2, or 3');
    }
    const pauseReason = body.pause_reason
      ? sanitizeString(String(body.pause_reason)).slice(0, 500)
      : null;

    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('id, status')
      .eq('user_id', user.id)
      .in('status', ['active', 'trialing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!subscription) {
      return badRequestResponse('No active subscription to pause');
    }

    const { data: existing } = await supabase
      .from('subscription_pauses')
      .select('id')
      .eq('subscription_id', subscription.id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return badRequestResponse('An active pause already exists');
    }

    const resumeAt = addMonths(new Date(), pauseMonths);
    const { data: pause, error } = await supabase
      .from('subscription_pauses')
      .insert({
        subscription_id: subscription.id,
        user_id: user.id,
        pause_months: pauseMonths,
        pause_reason: pauseReason,
        paused_at: new Date().toISOString(),
        resume_at: resumeAt.toISOString(),
        status: 'active',
        initiated_by: 'user',
      })
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to create pause' }, 500);

    await supabase
      .from('subscriptions')
      .update({ status: 'paused', updated_at: new Date().toISOString() })
      .eq('id', subscription.id)
      .eq('user_id', user.id);

    return secureJson({ data: pause }, 201);
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}

/** PATCH — resume an active pause early */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return badRequestResponse('Invalid JSON body');
    }

    const pauseId = sanitizeString(String(body.pause_id ?? ''));
    if (!pauseId || !isValidUUID(pauseId)) {
      return badRequestResponse('Valid pause_id is required');
    }

    const { data: pause, error: fetchErr } = await supabase
      .from('subscription_pauses')
      .select('*')
      .eq('id', pauseId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (fetchErr || !pause) {
      return badRequestResponse('Active pause not found');
    }

    const { data: updated, error } = await supabase
      .from('subscription_pauses')
      .update({
        status: 'resumed',
        resumed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', pauseId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return secureJson({ error: 'Failed to resume pause' }, 500);

    if (pause.subscription_id) {
      await supabase
        .from('subscriptions')
        .update({ status: 'active', updated_at: new Date().toISOString() })
        .eq('id', pause.subscription_id)
        .eq('user_id', user.id);
    }

    return secureJson({ data: updated });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
