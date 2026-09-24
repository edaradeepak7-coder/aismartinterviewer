import { NextRequest } from 'next/server';
import { secureJson, serverErrorResponse } from '@/lib/security/apiHelpers';
import { requireAdmin, isAdminAuth } from '@/lib/security/requireAdmin';
import { createServiceRoleClient } from '@/lib/supabase/server';

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!isAdminAuth(auth)) return auth.error;

    const segment = request.nextUrl.searchParams.get('segment') || 'all';
    const db = createServiceRoleClient();

    let query = db.from('user_profiles').select('id, role, created_at, subscription_plan');
    if (segment === 'candidate') query = query.eq('role', 'candidate');
    else if (segment === 'recruiter') query = query.eq('role', 'recruiter');
    else if (segment === 'institution')
      query = query.in('role', ['institution_admin', 'org_admin']);

    const { data, error } = await query.limit(10000);
    if (error) return secureJson({ error: error.message }, 500);

    const users = data || [];
    const now = new Date();

    // Cohort by signup month (last 8 months)
    const cohortMap = new Map<string, { size: number; ids: string[] }>();
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      cohortMap.set(monthKey(d), { size: 0, ids: [] });
    }

    for (const u of users) {
      if (!u.created_at) continue;
      const key = monthKey(new Date(u.created_at));
      if (!cohortMap.has(key)) continue;
      const c = cohortMap.get(key)!;
      c.size += 1;
      c.ids.push(u.id);
    }

    // Retention proxy: users still present (all are) — report signup cohort sizes only.
    // Without activity timestamps we cannot invent week-over-week retention.
    const cohorts = Array.from(cohortMap.entries()).map(([key, c]) => ({
      cohort: monthLabel(key),
      key,
      size: c.size,
      w0: c.size > 0 ? 100 : 0,
      // Subsequent weeks unknown without activity events
      weeks: null as null,
    }));

    const totalSignups = users.length;
    const paid = users.filter((u) => u.subscription_plan && u.subscription_plan !== 'free').length;

    const funnel = [
      { name: 'Signups', value: totalSignups, color: '#3B82F6', pct: 100 },
      {
        name: 'Paid / Upgraded',
        value: paid,
        color: '#10B981',
        pct: totalSignups > 0 ? Math.round((paid / totalSignups) * 100) : 0,
      },
    ];

    const byRole: Record<string, number> = {};
    users.forEach((u) => {
      byRole[u.role || 'unknown'] = (byRole[u.role || 'unknown'] || 0) + 1;
    });

    return secureJson({
      segment,
      kpis: {
        totalSignups,
        paid,
        conversionPct: totalSignups > 0 ? Math.round((paid / totalSignups) * 100) : 0,
        cohortsTracked: cohorts.filter((c) => c.size > 0).length,
      },
      cohorts,
      funnel,
      byRole,
      note: 'Retention weeks require activity events; showing signup cohorts only.',
    });
  } catch {
    return serverErrorResponse();
  }
}
