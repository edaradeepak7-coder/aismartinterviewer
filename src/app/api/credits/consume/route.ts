import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const body = await request.json();
    const { action_type, feature, credits, reference_id, reference_type } = body;

    if (!action_type || !feature || typeof credits !== 'number' || credits <= 0) {
      return secureJson({ error: 'Invalid parameters: action_type, feature, and credits are required' }, 400);
    }

    const { data, error } = await supabase.rpc('consume_credits', {
      p_user_id: user.id,
      p_action_type: action_type,
      p_feature: feature,
      p_credits: credits,
      p_reference_id: reference_id || null,
      p_reference_type: reference_type || null,
    });

    if (error) return secureJson({ error: error.message }, 500);

    const result = data as any;

    // If overage alert triggered, log it
    if (result?.alert_80 || result?.alert_90) {
      const threshold = result.alert_90 ? 90 : 80;
      console.log(`Credit alert: user ${user.id} at ${threshold}% usage`);
    }

    return secureJson({
      success: result?.success,
      credits_consumed: result?.credits_consumed,
      credits_remaining: result?.credits_remaining,
      is_overage: result?.is_overage,
      overage_amount_inr: result?.overage_amount_paise ? result.overage_amount_paise / 100 : 0,
      usage_pct: result?.usage_pct,
      alert_triggered: result?.alert_80 || result?.alert_90 || false,
    });
  } catch (err: any) {
    return secureJson({ error: err.message || 'Internal server error' }, 500);
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'current';

    let startDate: string;
    if (period === 'current') {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else {
      const now = new Date();
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    }

    const [subRes, usageRes, alertsRes] = await Promise.all([
      supabase.from('subscriptions').select('*').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('credit_usage').select('*').eq('user_id', user.id).gte('created_at', startDate).order('created_at', { ascending: false }),
      supabase.from('overage_alerts').select('*').eq('user_id', user.id).eq('resolved', false).order('created_at', { ascending: false }).limit(5),
    ]);

    // Aggregate usage by feature
    const usageByFeature: Record<string, { credits: number; count: number; overage_credits: number }> = {};
    (usageRes.data || []).forEach((u: any) => {
      if (!usageByFeature[u.feature]) usageByFeature[u.feature] = { credits: 0, count: 0, overage_credits: 0 };
      usageByFeature[u.feature].credits += u.credits_used;
      usageByFeature[u.feature].count += 1;
      if (u.is_overage) usageByFeature[u.feature].overage_credits += u.credits_used;
    });

    const totalOverageCredits = (usageRes.data || []).filter((u: any) => u.is_overage).reduce((sum: number, u: any) => sum + u.credits_used, 0);
    const totalOverageAmount = (usageRes.data || []).filter((u: any) => u.is_overage).reduce((sum: number, u: any) => sum + (u.overage_amount_paise || 0), 0) / 100;

    return secureJson({
      subscription: subRes.data,
      usage_by_feature: Object.entries(usageByFeature).map(([feature, data]) => ({ feature, ...data })),
      total_credits_used: (usageRes.data || []).reduce((sum: number, u: any) => sum + u.credits_used, 0),
      total_overage_credits: totalOverageCredits,
      total_overage_amount_inr: totalOverageAmount,
      pending_alerts: alertsRes.data || [],
      period_start: startDate,
    });
  } catch (err: any) {
    return secureJson({ error: err.message || 'Internal server error' }, 500);
  }
}
