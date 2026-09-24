'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import {
  Trophy, Star, TrendingUp, TrendingDown, Minus, Medal, Crown, ChevronRight, Users
} from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  points: number;
  stars: number;
  badges: number;
  change: 'up' | 'down' | 'same';
  changeAmount: number;
  isCurrentUser?: boolean;
  avatar?: string;
}

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Priya Sharma', initials: 'PS', points: 12450, stars: 48, badges: 12, change: 'same', changeAmount: 0 },
  { rank: 2, name: 'Arjun Mehta', initials: 'AM', points: 11820, stars: 44, badges: 10, change: 'up', changeAmount: 1 },
  { rank: 3, name: 'Kavya Reddy', initials: 'KR', points: 10990, stars: 41, badges: 9, change: 'down', changeAmount: 1 },
  { rank: 4, name: 'Rahul Gupta', initials: 'RG', points: 9870, stars: 38, badges: 8, change: 'up', changeAmount: 2 },
  { rank: 5, name: 'You', initials: 'JC', points: 8240, stars: 32, badges: 6, change: 'up', changeAmount: 3, isCurrentUser: true },
  { rank: 6, name: 'Sneha Patel', initials: 'SP', points: 7650, stars: 29, badges: 5, change: 'down', changeAmount: 1 },
  { rank: 7, name: 'Vikram Singh', initials: 'VS', points: 6980, stars: 26, badges: 4, change: 'same', changeAmount: 0 },
];

const RANK_COLORS = ['text-amber-400', 'text-slate-400', 'text-amber-600'];
const RANK_BG = ['bg-amber-50 border-amber-200', 'bg-slate-50 border-slate-200', 'bg-amber-50/50 border-amber-100'];

interface LeaderboardWidgetProps {
  compact?: boolean;
  showFullLink?: boolean;
  title?: string;
  filter?: 'global' | 'course' | 'interview' | 'assessment';
}

export default function LeaderboardWidget({
  compact = false,
  showFullLink = true,
  title = 'Leaderboard',
}: LeaderboardWidgetProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  const currentUser = MOCK_LEADERBOARD.find(e => e.isCurrentUser);

  return (
    <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E8ECF4] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={16} className="text-amber-500" />
          <h3 className="text-sm font-800 text-[#0D1B3E]">{title}</h3>
        </div>
        <div className="flex items-center gap-1 bg-[#F4F6FA] rounded-lg p-0.5">
          {(['week', 'month', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={[
                'px-2.5 py-1 rounded-md text-[11px] font-600 transition-all',
                timeRange === r ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99] hover:text-[#0D1B3E]',
              ].join(' ')}
            >
              {r === 'week' ? 'Week' : r === 'month' ? 'Month' : 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Current user rank highlight */}
      {currentUser && (
        <div className="mx-4 mt-4 bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-[11px] font-700 text-white shrink-0">
            {currentUser.initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-700 text-[#0D1B3E]">Your Rank</p>
            <p className="text-[11px] text-[#6B7A99]">{currentUser.points.toLocaleString()} pts · {currentUser.stars} stars</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xl font-800 text-teal-600">#{currentUser.rank}</p>
            <div className="flex items-center gap-0.5 justify-end">
              <TrendingUp size={10} className="text-teal-500" />
              <span className="text-[10px] text-teal-600 font-600">+{currentUser.changeAmount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard list */}
      <div className="divide-y divide-[#F4F6FA] mt-3">
        {MOCK_LEADERBOARD.slice(0, compact ? 5 : 7).map((entry) => (
          <div
            key={entry.rank}
            className={[
              'flex items-center gap-3 px-5 py-3 transition-colors',
              entry.isCurrentUser ? 'bg-teal-50/50' : 'hover:bg-[#F8FAFC]',
            ].join(' ')}
          >
            {/* Rank */}
            <div className="w-7 shrink-0 text-center">
              {entry.rank <= 3 ? (
                <div className={`w-6 h-6 rounded-full border flex items-center justify-center mx-auto ${RANK_BG[entry.rank - 1]}`}>
                  {entry.rank === 1 ? <Crown size={11} className={RANK_COLORS[0]} /> :
                   entry.rank === 2 ? <Medal size={11} className={RANK_COLORS[1]} /> :
                   <Medal size={11} className={RANK_COLORS[2]} />}
                </div>
              ) : (
                <span className="text-xs font-700 text-[#6B7A99]">#{entry.rank}</span>
              )}
            </div>

            {/* Avatar */}
            <div className={[
              'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-700 text-white shrink-0',
              entry.isCurrentUser ? 'bg-gradient-to-br from-teal-500 to-cyan-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600',
            ].join(' ')}>
              {entry.initials}
            </div>

            {/* Name + stats */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-700 truncate ${entry.isCurrentUser ? 'text-teal-700' : 'text-[#0D1B3E]'}`}>
                {entry.name} {entry.isCurrentUser && <span className="text-[10px] font-600 text-teal-500">(You)</span>}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[10px] text-[#6B7A99]">{entry.points.toLocaleString()} pts</span>
                <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                  <Star size={9} fill="currentColor" /> {entry.stars}
                </span>
              </div>
            </div>

            {/* Change indicator */}
            <div className="shrink-0">
              {entry.change === 'up' && (
                <div className="flex items-center gap-0.5 text-teal-500">
                  <TrendingUp size={11} />
                  <span className="text-[10px] font-600">+{entry.changeAmount}</span>
                </div>
              )}
              {entry.change === 'down' && (
                <div className="flex items-center gap-0.5 text-red-400">
                  <TrendingDown size={11} />
                  <span className="text-[10px] font-600">-{entry.changeAmount}</span>
                </div>
              )}
              {entry.change === 'same' && (
                <Minus size={11} className="text-[#6B7A99]" />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {showFullLink && (
        <div className="px-5 py-3 border-t border-[#E8ECF4]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-[11px] text-[#6B7A99]">
              <Users size={11} />
              <span>1,247 participants this week</span>
            </div>
            <Link
              href="/leaderboard"
              className="flex items-center gap-1 text-xs font-600 text-[#0D9488] hover:text-[#0B7A6E] transition-colors"
            >
              Full Leaderboard <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
