'use client';
import AppLayout from '@/components/AppLayout';
import { Trophy, Star, TrendingUp, Minus, Crown, Medal, Award, Filter, Users, Zap, Target, BookOpen, Code2, BarChart2, ChevronUp, ChevronDown, Flame, Shield, Search } from 'lucide-react';
import { useState, useMemo } from 'react';

type FilterType = 'global' | 'course' | 'subject' | 'assessment' | 'interview';
type TimeRange = 'today' | 'week' | 'month' | 'all';

interface LeaderboardEntry {
  rank: number;
  name: string;
  initials: string;
  points: number;
  stars: number;
  badges: number;
  streak: number;
  change: 'up' | 'down' | 'same';
  changeAmount: number;
  isCurrentUser?: boolean;
  level: string;
  completions: number;
  avgScore: number;
  achievements: string[];
}

const BADGE_DEFS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  streak7:   { label: '7-Day Streak',    color: 'bg-orange-50 text-orange-600 border-orange-200',  icon: <Flame size={10} /> },
  streak30:  { label: '30-Day Streak',   color: 'bg-red-50 text-red-600 border-red-200',           icon: <Flame size={10} /> },
  top10:     { label: 'Top 10',          color: 'bg-amber-50 text-amber-600 border-amber-200',     icon: <Trophy size={10} /> },
  top3:      { label: 'Top 3',           color: 'bg-yellow-50 text-yellow-700 border-yellow-200',  icon: <Crown size={10} /> },
  perfect:   { label: 'Perfect Score',   color: 'bg-teal-50 text-teal-600 border-teal-200',        icon: <Star size={10} /> },
  speedster: { label: 'Speedster',       color: 'bg-blue-50 text-blue-600 border-blue-200',        icon: <Zap size={10} /> },
  champion:  { label: 'Champion',        color: 'bg-violet-50 text-violet-600 border-violet-200',  icon: <Shield size={10} /> },
  consistent:{ label: 'Consistent',      color: 'bg-green-50 text-green-600 border-green-200',     icon: <Target size={10} /> },
};

const MOCK_DATA: Record<FilterType, LeaderboardEntry[]> = {
  global: [
    { rank: 1, name: 'Priya Sharma',   initials: 'PS', points: 12450, stars: 48, badges: 12, streak: 30, change: 'same', changeAmount: 0, level: 'Expert',      completions: 24, avgScore: 94, achievements: ['top3','streak30','champion','perfect'] },
    { rank: 2, name: 'Arjun Mehta',    initials: 'AM', points: 11820, stars: 44, badges: 10, streak: 18, change: 'up',   changeAmount: 1, level: 'Expert',      completions: 21, avgScore: 91, achievements: ['top3','streak7','perfect'] },
    { rank: 3, name: 'Kavya Reddy',    initials: 'KR', points: 10990, stars: 41, badges: 9,  streak: 12, change: 'down', changeAmount: 1, level: 'Advanced',    completions: 19, avgScore: 89, achievements: ['top3','consistent','speedster'] },
    { rank: 4, name: 'Rahul Gupta',    initials: 'RG', points: 9870,  stars: 38, badges: 8,  streak: 7,  change: 'up',   changeAmount: 2, level: 'Advanced',    completions: 17, avgScore: 86, achievements: ['top10','streak7'] },
    { rank: 5, name: 'You',            initials: 'JC', points: 8240,  stars: 32, badges: 6,  streak: 5,  change: 'up',   changeAmount: 3, level: 'Intermediate',completions: 14, avgScore: 82, achievements: ['top10','consistent'], isCurrentUser: true },
    { rank: 6, name: 'Sneha Patel',    initials: 'SP', points: 7650,  stars: 29, badges: 5,  streak: 4,  change: 'down', changeAmount: 1, level: 'Intermediate',completions: 12, avgScore: 79, achievements: ['top10'] },
    { rank: 7, name: 'Vikram Singh',   initials: 'VS', points: 6980,  stars: 26, badges: 4,  streak: 3,  change: 'same', changeAmount: 0, level: 'Intermediate',completions: 11, avgScore: 76, achievements: ['speedster'] },
    { rank: 8, name: 'Ananya Iyer',    initials: 'AI', points: 6120,  stars: 23, badges: 3,  streak: 2,  change: 'up',   changeAmount: 1, level: 'Beginner',    completions: 9,  avgScore: 73, achievements: ['consistent'] },
    { rank: 9, name: 'Rohan Das',      initials: 'RD', points: 5480,  stars: 20, badges: 2,  streak: 1,  change: 'down', changeAmount: 2, level: 'Beginner',    completions: 8,  avgScore: 70, achievements: [] },
    { rank: 10, name: 'Meera Nair',    initials: 'MN', points: 4920,  stars: 18, badges: 2,  streak: 0,  change: 'same', changeAmount: 0, level: 'Beginner',    completions: 7,  avgScore: 68, achievements: [] },
  ],
  course: [
    { rank: 1, name: 'Kavya Reddy',    initials: 'KR', points: 4200,  stars: 18, badges: 5,  streak: 12, change: 'up',   changeAmount: 2, level: 'Advanced',    completions: 8,  avgScore: 96, achievements: ['perfect','champion'] },
    { rank: 2, name: 'Priya Sharma',   initials: 'PS', points: 3980,  stars: 16, badges: 4,  streak: 30, change: 'down', changeAmount: 1, level: 'Expert',      completions: 7,  avgScore: 93, achievements: ['streak30','top3'] },
    { rank: 3, name: 'You',            initials: 'JC', points: 3540,  stars: 14, badges: 3,  streak: 5,  change: 'up',   changeAmount: 4, level: 'Intermediate',completions: 6,  avgScore: 88, achievements: ['consistent'], isCurrentUser: true },
    { rank: 4, name: 'Arjun Mehta',    initials: 'AM', points: 3210,  stars: 13, badges: 3,  streak: 18, change: 'same', changeAmount: 0, level: 'Expert',      completions: 6,  avgScore: 85, achievements: ['streak7'] },
    { rank: 5, name: 'Sneha Patel',    initials: 'SP', points: 2890,  stars: 11, badges: 2,  streak: 4,  change: 'down', changeAmount: 1, level: 'Intermediate',completions: 5,  avgScore: 82, achievements: [] },
  ],
  subject: [
    { rank: 1, name: 'Arjun Mehta',    initials: 'AM', points: 5100,  stars: 20, badges: 6,  streak: 18, change: 'same', changeAmount: 0, level: 'Expert',      completions: 10, avgScore: 95, achievements: ['perfect','top3','streak7'] },
    { rank: 2, name: 'Rahul Gupta',    initials: 'RG', points: 4750,  stars: 18, badges: 5,  streak: 7,  change: 'up',   changeAmount: 1, level: 'Advanced',    completions: 9,  avgScore: 91, achievements: ['top3','speedster'] },
    { rank: 3, name: 'You',            initials: 'JC', points: 4200,  stars: 16, badges: 4,  streak: 5,  change: 'up',   changeAmount: 2, level: 'Intermediate',completions: 8,  avgScore: 87, achievements: ['consistent'], isCurrentUser: true },
    { rank: 4, name: 'Priya Sharma',   initials: 'PS', points: 3900,  stars: 15, badges: 4,  streak: 30, change: 'down', changeAmount: 1, level: 'Expert',      completions: 7,  avgScore: 84, achievements: ['streak30'] },
    { rank: 5, name: 'Vikram Singh',   initials: 'VS', points: 3400,  stars: 13, badges: 3,  streak: 3,  change: 'same', changeAmount: 0, level: 'Intermediate',completions: 6,  avgScore: 80, achievements: [] },
  ],
  assessment: [
    { rank: 1, name: 'Priya Sharma',   initials: 'PS', points: 3800,  stars: 15, badges: 5,  streak: 30, change: 'same', changeAmount: 0, level: 'Expert',      completions: 15, avgScore: 97, achievements: ['perfect','champion','top3'] },
    { rank: 2, name: 'You',            initials: 'JC', points: 3200,  stars: 12, badges: 3,  streak: 5,  change: 'up',   changeAmount: 3, level: 'Intermediate',completions: 12, avgScore: 88, achievements: ['speedster'], isCurrentUser: true },
    { rank: 3, name: 'Ananya Iyer',    initials: 'AI', points: 2900,  stars: 11, badges: 3,  streak: 2,  change: 'up',   changeAmount: 1, level: 'Beginner',    completions: 11, avgScore: 85, achievements: ['consistent'] },
    { rank: 4, name: 'Kavya Reddy',    initials: 'KR', points: 2600,  stars: 10, badges: 2,  streak: 12, change: 'down', changeAmount: 2, level: 'Advanced',    completions: 10, avgScore: 82, achievements: [] },
    { rank: 5, name: 'Rohan Das',      initials: 'RD', points: 2200,  stars: 8,  badges: 2,  streak: 1,  change: 'same', changeAmount: 0, level: 'Beginner',    completions: 9,  avgScore: 78, achievements: [] },
  ],
  interview: [
    { rank: 1, name: 'Rahul Gupta',    initials: 'RG', points: 4600,  stars: 18, badges: 6,  streak: 7,  change: 'up',   changeAmount: 2, level: 'Advanced',    completions: 12, avgScore: 93, achievements: ['top3','champion','perfect'] },
    { rank: 2, name: 'Arjun Mehta',    initials: 'AM', points: 4200,  stars: 16, badges: 5,  streak: 18, change: 'same', changeAmount: 0, level: 'Expert',      completions: 11, avgScore: 90, achievements: ['top3','streak7'] },
    { rank: 3, name: 'Priya Sharma',   initials: 'PS', points: 3900,  stars: 15, badges: 4,  streak: 30, change: 'down', changeAmount: 1, level: 'Expert',      completions: 10, avgScore: 88, achievements: ['streak30','consistent'] },
    { rank: 4, name: 'You',            initials: 'JC', points: 3100,  stars: 12, badges: 3,  streak: 5,  change: 'up',   changeAmount: 1, level: 'Intermediate',completions: 8,  avgScore: 82, achievements: ['speedster'], isCurrentUser: true },
    { rank: 5, name: 'Sneha Patel',    initials: 'SP', points: 2700,  stars: 10, badges: 2,  streak: 4,  change: 'down', changeAmount: 1, level: 'Intermediate',completions: 7,  avgScore: 78, achievements: [] },
  ],
};

const FILTER_LABELS: Record<FilterType, { label: string; icon: React.ReactNode; desc: string }> = {
  global:     { label: 'Global',     icon: <Trophy size={14} />,   desc: 'All platform activity' },
  course:     { label: 'Courses',    icon: <BookOpen size={14} />, desc: 'Course completions & progress' },
  subject:    { label: 'Subjects',   icon: <Target size={14} />,   desc: 'Subject-wise performance' },
  assessment: { label: 'Assessment', icon: <BarChart2 size={14} />,desc: 'MCQ & assessment scores' },
  interview:  { label: 'Interview',  icon: <Code2 size={14} />,    desc: 'Mock interview performance' },
};

const TIME_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
  all: 'All Time',
};

const LEVEL_COLORS: Record<string, string> = {
  Expert:       'bg-violet-50 text-violet-700 border-violet-200',
  Advanced:     'bg-blue-50 text-blue-700 border-blue-200',
  Intermediate: 'bg-teal-50 text-teal-700 border-teal-200',
  Beginner:     'bg-gray-50 text-gray-600 border-gray-200',
};

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) return <Crown size={14} className="text-amber-400" />;
  if (rank === 2) return <Medal size={14} className="text-slate-400" />;
  if (rank === 3) return <Medal size={14} className="text-amber-600" />;
  return <span className="text-xs font-700 text-[#6B7A99]">#{rank}</span>;
}

function ChangeIndicator({ change, amount }: { change: 'up' | 'down' | 'same'; amount: number }) {
  if (change === 'up') return (
    <div className="flex items-center gap-0.5 text-teal-500">
      <ChevronUp size={13} />
      <span className="text-[10px] font-700">{amount}</span>
    </div>
  );
  if (change === 'down') return (
    <div className="flex items-center gap-0.5 text-red-400">
      <ChevronDown size={13} />
      <span className="text-[10px] font-700">{amount}</span>
    </div>
  );
  return <Minus size={12} className="text-[#C4CAD9]" />;
}

export default function LeaderboardPage() {
  const [filter, setFilter] = useState<FilterType>('global');
  const [timeRange, setTimeRange] = useState<TimeRange>('week');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const entries = useMemo(() => {
    const base = MOCK_DATA[filter] ?? MOCK_DATA.global;
    if (!search.trim()) return base;
    return base.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
  }, [filter, search]);

  const currentUser = entries.find(e => e.isCurrentUser);
  const top3 = MOCK_DATA[filter].slice(0, 3);

  return (
    <AppLayout role="candidate">
      <div className="space-y-6 fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] flex items-center gap-2">
              <Trophy size={22} className="text-amber-500" /> Universal Leaderboard
            </h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              {FILTER_LABELS[filter].desc} · {TIME_LABELS[timeRange]}
            </p>
          </div>
          {/* Time range */}
          <div className="flex items-center gap-1 bg-[#F4F6FA] rounded-xl p-1 self-start sm:self-auto">
            {(['today', 'week', 'month', 'all'] as TimeRange[]).map(t => (
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

        {/* Filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#6B7A99] shrink-0" />
          {(Object.keys(FILTER_LABELS) as FilterType[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-600 border transition-all',
                filter === f
                  ? 'bg-[#0D1B3E] text-white border-[#0D1B3E]'
                  : 'bg-white text-[#6B7A99] border-[#DDE3EE] hover:border-[#0D9488] hover:text-[#0D9488]',
              ].join(' ')}
            >
              {FILTER_LABELS[f].icon}
              {FILTER_LABELS[f].label}
            </button>
          ))}
        </div>

        {/* Podium — top 3 */}
        <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          {[top3[1], top3[0], top3[2]].map((entry, idx) => {
            if (!entry) return null;
            const podiumRank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
            const heights = ['h-24', 'h-32', 'h-20'];
            const gradients = [
              'from-slate-400 to-slate-500',
              'from-amber-400 to-yellow-500',
              'from-amber-600 to-orange-600',
            ];
            return (
              <div key={entry.rank} className="flex flex-col items-center gap-2">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradients[idx]} flex items-center justify-center text-sm font-800 text-white shadow-md`}>
                  {entry.initials}
                </div>
                <p className="text-xs font-700 text-[#0D1B3E] text-center truncate w-full px-1">{entry.name}</p>
                <p className="text-[10px] text-[#6B7A99]">{entry.points.toLocaleString()} pts</p>
                <div className={`w-full ${heights[idx]} bg-gradient-to-t ${gradients[idx]} rounded-t-xl flex items-start justify-center pt-2`}>
                  <span className="text-white font-800 text-lg">#{podiumRank}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden">
            {/* Search */}
            <div className="px-5 py-3 border-b border-[#E8ECF4] flex items-center gap-2">
              <Search size={14} className="text-[#6B7A99]" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search participants..."
                className="flex-1 text-sm text-[#0D1B3E] placeholder-[#C4CAD9] outline-none bg-transparent"
              />
              <span className="text-xs text-[#6B7A99]">{entries.length} participants</span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-2 bg-[#F8FAFC] border-b border-[#E8ECF4] text-[10px] font-700 text-[#6B7A99] uppercase tracking-wide">
              <div className="col-span-1">Rank</div>
              <div className="col-span-4">Participant</div>
              <div className="col-span-2 text-right">Points</div>
              <div className="col-span-2 text-right hidden sm:block">Stars</div>
              <div className="col-span-2 text-right hidden sm:block">Avg Score</div>
              <div className="col-span-1 text-right">Δ</div>
            </div>

            {/* Rows */}
            <div className="divide-y divide-[#F4F6FA]">
              {entries.map((entry) => (
                <div key={entry.rank}>
                  <div
                    className={[
                      'grid grid-cols-12 gap-2 px-5 py-3 items-center cursor-pointer transition-colors',
                      entry.isCurrentUser ? 'bg-teal-50/60' : 'hover:bg-[#F8FAFC]',
                    ].join(' ')}
                    onClick={() => setExpandedRow(expandedRow === entry.rank ? null : entry.rank)}
                  >
                    <div className="col-span-1 flex items-center justify-center">
                      <RankIcon rank={entry.rank} />
                    </div>
                    <div className="col-span-4 flex items-center gap-2 min-w-0">
                      <div className={[
                        'w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-700 text-white shrink-0',
                        entry.isCurrentUser ? 'bg-gradient-to-br from-teal-500 to-cyan-600' : 'bg-gradient-to-br from-violet-500 to-indigo-600',
                      ].join(' ')}>
                        {entry.initials}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-700 truncate ${entry.isCurrentUser ? 'text-teal-700' : 'text-[#0D1B3E]'}`}>
                          {entry.name} {entry.isCurrentUser && <span className="text-[10px] text-teal-500">(You)</span>}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-600 border ${LEVEL_COLORS[entry.level] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                          {entry.level}
                        </span>
                      </div>
                    </div>
                    <div className="col-span-2 text-right">
                      <span className="text-sm font-800 text-[#0D1B3E]">{entry.points.toLocaleString()}</span>
                    </div>
                    <div className="col-span-2 text-right hidden sm:flex items-center justify-end gap-1">
                      <Star size={11} className="text-amber-400" fill="currentColor" />
                      <span className="text-xs font-600 text-[#0D1B3E]">{entry.stars}</span>
                    </div>
                    <div className="col-span-2 text-right hidden sm:block">
                      <span className="text-xs font-600 text-[#0D1B3E]">{entry.avgScore}%</span>
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <ChangeIndicator change={entry.change} amount={entry.changeAmount} />
                    </div>
                  </div>

                  {/* Expanded row */}
                  {expandedRow === entry.rank && (
                    <div className="px-5 pb-4 bg-[#F8FAFC] border-t border-[#E8ECF4]">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 mb-3">
                        {[
                          { label: 'Completions', value: entry.completions },
                          { label: 'Badges', value: entry.badges },
                          { label: 'Streak', value: `${entry.streak}d` },
                          { label: 'Avg Score', value: `${entry.avgScore}%` },
                        ].map(s => (
                          <div key={s.label} className="bg-white rounded-lg border border-[#E8ECF4] p-2.5 text-center">
                            <p className="text-sm font-800 text-[#0D1B3E]">{s.value}</p>
                            <p className="text-[10px] text-[#6B7A99]">{s.label}</p>
                          </div>
                        ))}
                      </div>
                      {entry.achievements.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {entry.achievements.map(a => {
                            const def = BADGE_DEFS[a];
                            if (!def) return null;
                            return (
                              <span key={a} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-600 border ${def.color}`}>
                                {def.icon} {def.label}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {entries.length === 0 && (
              <div className="py-12 text-center">
                <Users size={32} className="text-[#C4CAD9] mx-auto mb-2" />
                <p className="text-sm text-[#6B7A99]">No participants found</p>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-4">
            {/* Your stats */}
            {currentUser && (
              <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
                <h3 className="text-sm font-800 text-[#0D1B3E] mb-4 flex items-center gap-2">
                  <TrendingUp size={14} className="text-teal-500" /> Your Stats
                </h3>
                <div className="space-y-0">
                  {[
                    { label: 'Current Rank',  value: `#${currentUser.rank}`,                    icon: <Trophy size={13} className="text-amber-500" /> },
                    { label: 'Total Points',  value: currentUser.points.toLocaleString(),        icon: <Zap size={13} className="text-violet-500" /> },
                    { label: 'Stars Earned',  value: currentUser.stars.toString(),               icon: <Star size={13} className="text-amber-400" fill="currentColor" /> },
                    { label: 'Badges',        value: currentUser.badges.toString(),              icon: <Award size={13} className="text-blue-500" /> },
                    { label: 'Streak',        value: `${currentUser.streak} days`,               icon: <Flame size={13} className="text-orange-500" /> },
                    { label: 'Avg Score',     value: `${currentUser.avgScore}%`,                 icon: <BarChart2 size={13} className="text-teal-500" /> },
                    { label: 'Completions',   value: currentUser.completions.toString(),         icon: <Target size={13} className="text-green-500" /> },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between py-2 border-b border-[#F4F6FA] last:border-0">
                      <div className="flex items-center gap-2">
                        {s.icon}
                        <span className="text-xs text-[#6B7A99]">{s.label}</span>
                      </div>
                      <span className="text-sm font-700 text-[#0D1B3E]">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Achievement badges */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <h3 className="text-sm font-800 text-[#0D1B3E] mb-4 flex items-center gap-2">
                <Award size={14} className="text-violet-500" /> Achievement Badges
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(BADGE_DEFS).map(([key, def]) => {
                  const earned = currentUser?.achievements.includes(key) ?? false;
                  return (
                    <div
                      key={key}
                      className={[
                        'flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-[10px] font-600 transition-all',
                        earned ? def.color : 'bg-[#F8FAFC] text-[#C4CAD9] border-[#E8ECF4] opacity-60',
                      ].join(' ')}
                    >
                      {def.icon}
                      <span className="truncate">{def.label}</span>
                      {earned && <span className="ml-auto text-[8px]">✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Participants count */}
            <div className="bg-gradient-to-br from-[#0D1B3E] to-[#1a2f5e] rounded-2xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Users size={16} className="text-teal-400" />
                <span className="text-sm font-700">Platform Activity</span>
              </div>
              <p className="text-3xl font-800 mb-1">1,247</p>
              <p className="text-xs text-white/60">Active participants this week</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {[
                  { label: 'New this week', value: '+84' },
                  { label: 'Avg score',     value: '78%' },
                ].map(s => (
                  <div key={s.label} className="bg-white/10 rounded-lg p-2.5">
                    <p className="text-sm font-800">{s.value}</p>
                    <p className="text-[10px] text-white/60">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
