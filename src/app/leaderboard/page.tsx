'use client';
import AppLayout from '@/components/AppLayout';
import {
  Trophy, TrendingUp, Minus, Crown, Medal, Filter, Search, Loader2, Users,
} from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';

type TimeRange = 'today' | 'week' | 'month' | 'all';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  initials: string;
  points: number;
  isCurrentUser?: boolean;
  updatedAt?: string;
}

const TIME_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={14} className="text-amber-400" />;
  if (rank === 2) return <Medal size={14} className="text-slate-400" />;
  if (rank === 3) return <Medal size={14} className="text-amber-600" />;
  return <span className="text-xs font-700 text-[#6B7A99]">#{rank}</span>;
}

export function LeaderboardContent() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [yourRank, setYourRank] = useState<number | null>(null);
  const [yourPoints, setYourPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leaderboard?period=${timeRange}`);
      if (res.status === 401) {
        setError('Sign in to view the leaderboard.');
        setEntries([]);
        return;
      }
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Failed to load leaderboard');
        setEntries([]);
        return;
      }
      setEntries(json.entries || []);
      setYourRank(json.yourRank ?? null);
      setYourPoints(json.yourPoints ?? 0);
    } catch {
      setError('Failed to load leaderboard');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, search]);

  const top3 = filtered.slice(0, 3);
  const currentUser = entries.find((e) => e.isCurrentUser);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E] flex items-center gap-2">
            <Trophy size={22} className="text-amber-500" /> Universal Leaderboard
          </h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">
            Ranked by points · {TIME_LABELS[timeRange]}
          </p>
        </div>
        <div className="flex items-center gap-1 bg-[#F4F6FA] rounded-xl p-1 self-start sm:self-auto">
          {(Object.keys(TIME_LABELS) as TimeRange[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-600 transition-all',
                timeRange === t ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]',
              ].join(' ')}
            >
              {TIME_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2.5 max-w-md">
        <Search size={14} className="text-[#6B7A99]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search candidates..."
          className="flex-1 text-sm outline-none bg-transparent text-[#0D1B3E] placeholder-[#C4CAD9]"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-teal-600" size={28} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#DDE3EE] rounded-2xl">
          <Users size={36} className="text-[#C4CAD9] mx-auto mb-3" />
          <p className="text-sm font-600 text-[#6B7A99]">No leaderboard scores yet</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            Scores appear here once candidates earn points on the platform.
          </p>
        </div>
      ) : (
        <>
          {top3.length >= 1 && (
            <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
              {[top3[1], top3[0], top3[2]].map((entry, idx) => {
                if (!entry) return null;
                const heights = ['h-24', 'h-32', 'h-20'];
                const gradients = [
                  'from-slate-400 to-slate-500',
                  'from-amber-400 to-yellow-500',
                  'from-amber-600 to-orange-600',
                ];
                return (
                  <div key={entry.userId} className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full bg-[#0D1B3E] text-white flex items-center justify-center text-sm font-700 mb-2">
                      {entry.initials}
                    </div>
                    <p className="text-xs font-700 text-[#0D1B3E] truncate max-w-full">{entry.name}</p>
                    <p className="text-[10px] text-[#6B7A99] mb-2">{entry.points.toLocaleString()} pts</p>
                    <div
                      className={`w-full ${heights[idx]} rounded-t-xl bg-gradient-to-b ${gradients[idx]} flex items-start justify-center pt-2`}
                    >
                      <RankIcon rank={entry.rank} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 bg-white border border-[#E8ECF4] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F4F6FA] text-[10px] uppercase tracking-wide text-[#6B7A99]">
                    <th className="text-left px-4 py-3 font-600">Rank</th>
                    <th className="text-left px-4 py-3 font-600">Candidate</th>
                    <th className="text-right px-4 py-3 font-600">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr
                      key={e.userId}
                      className={[
                        'border-t border-[#F0F3F9]',
                        e.isCurrentUser ? 'bg-teal-50/50' : '',
                      ].join(' ')}
                    >
                      <td className="px-4 py-3">
                        <RankIcon rank={e.rank} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#0D1B3E] text-white text-[10px] font-700 flex items-center justify-center">
                            {e.initials}
                          </div>
                          <span className="font-600 text-[#0D1B3E]">
                            {e.name}
                            {e.isCurrentUser ? ' (You)' : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-700 text-[#0D1B3E]">
                        {e.points.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-4">
              <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                <h3 className="text-sm font-700 text-[#0D1B3E] mb-3 flex items-center gap-2">
                  <TrendingUp size={14} className="text-teal-600" /> Your Stats
                </h3>
                {currentUser || yourRank != null ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#6B7A99]">Rank</span>
                      <span className="font-700 text-[#0D1B3E]">
                        {yourRank != null ? `#${yourRank}` : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#6B7A99]">Points</span>
                      <span className="font-700 text-[#0D1B3E]">{yourPoints.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-[#6B7A99]">
                    You don&apos;t have a score for this period yet.
                  </p>
                )}
              </div>
              <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5">
                <h3 className="text-sm font-700 text-[#0D1B3E] mb-2 flex items-center gap-2">
                  <Filter size={14} /> Period
                </h3>
                <p className="text-xs text-[#6B7A99] flex items-center gap-1">
                  <Minus size={12} /> Showing {filtered.length} of {entries.length} ranked
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <AppLayout role="candidate">
      <LeaderboardContent />
    </AppLayout>
  );
}
