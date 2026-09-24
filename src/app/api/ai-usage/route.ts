import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const period = request.nextUrl.searchParams.get('period') || '7d';
    const days = period === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const db = createServiceRoleClient();
    const { data, error } = await db
      .from('ai_usage_logs')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(5000);

    if (error) return secureJson({ error: error.message }, 500);

    const logs = data || [];
    const totalTokensIn = logs.reduce((s, l) => s + Number(l.tokens_in || 0), 0);
    const totalTokensOut = logs.reduce((s, l) => s + Number(l.tokens_out || 0), 0);
    const totalCost = logs.reduce((s, l) => s + Number(l.cost_usd || 0), 0);

    const byProvider: Record<string, { calls: number; tokensIn: number; tokensOut: number; cost: number }> =
      {};
    const dayMap: Record<string, { day: string; calls: number; cost: number }> = {};

    for (const l of logs) {
      const p = l.provider || 'unknown';
      if (!byProvider[p]) byProvider[p] = { calls: 0, tokensIn: 0, tokensOut: 0, cost: 0 };
      byProvider[p].calls += 1;
      byProvider[p].tokensIn += Number(l.tokens_in || 0);
      byProvider[p].tokensOut += Number(l.tokens_out || 0);
      byProvider[p].cost += Number(l.cost_usd || 0);

      const d = new Date(l.created_at);
      const dayKey =
        period === '7d'
          ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
          : `${d.getMonth() + 1}/${d.getDate()}`;
      if (!dayMap[dayKey]) dayMap[dayKey] = { day: dayKey, calls: 0, cost: 0 };
      dayMap[dayKey].calls += 1;
      dayMap[dayKey].cost += Number(l.cost_usd || 0);
    }

    return secureJson({
      period,
      empty: logs.length === 0,
      kpis: {
        totalCalls: logs.length,
        tokensIn: totalTokensIn,
        tokensOut: totalTokensOut,
        tokensUsed: totalTokensIn + totalTokensOut,
        estimatedCost: totalCost,
      },
      byProvider: Object.entries(byProvider).map(([provider, v]) => ({ provider, ...v })),
      daily: Object.values(dayMap),
      recent: logs.slice(-50).reverse(),
      note:
        logs.length === 0
          ? 'No ai_usage_logs yet. Usage will appear when AI calls are instrumented.'
          : undefined,
    });
  } catch {
    return serverErrorResponse();
  }
}
