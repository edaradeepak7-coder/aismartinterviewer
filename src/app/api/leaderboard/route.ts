import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { secureJson, unauthorizedResponse } from '@/lib/security/apiHelpers';

/**
 * GET /api/leaderboard?period=week
 * Ranked scores for the given rank_period. Empty when no rows.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return unauthorizedResponse();

    const period = request.nextUrl.searchParams.get('period') || 'all';
    const allowed = new Set(['today', 'week', 'month', 'all']);
    const rankPeriod = allowed.has(period) ? period : 'all';

    const { data: rows, error } = await supabase
      .from('leaderboard_scores')
      .select('user_id, points, rank_period, updated_at')
      .eq('rank_period', rankPeriod)
      .order('points', { ascending: false })
      .limit(100);

    if (error) return secureJson({ error: error.message }, 500);

    const scores = rows || [];
    const userIds = [...new Set(scores.map((r) => r.user_id))];
    const profileMap: Record<string, { full_name: string | null; email: string | null }> = {};

    if (userIds.length) {
      const { data: profiles } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .in('id', userIds);
      for (const p of profiles || []) {
        profileMap[p.id] = { full_name: p.full_name, email: p.email };
      }
    }

    const entries = scores.map((row, idx) => {
      const profile = profileMap[row.user_id];
      const name =
        profile?.full_name?.trim() ||
        profile?.email?.split('@')[0] ||
        'Candidate';
      const initials = name
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      return {
        rank: idx + 1,
        userId: row.user_id,
        name,
        initials: initials || '?',
        points: row.points,
        isCurrentUser: row.user_id === user.id,
        updatedAt: row.updated_at,
      };
    });

    return secureJson({
      period: rankPeriod,
      entries,
      yourRank: entries.find((e) => e.isCurrentUser)?.rank ?? null,
      yourPoints: entries.find((e) => e.isCurrentUser)?.points ?? 0,
    });
  } catch {
    return secureJson({ error: 'Internal server error' }, 500);
  }
}
