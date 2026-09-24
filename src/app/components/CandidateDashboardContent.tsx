'use client';
import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame, BarChart2, BookOpen, Award, Zap, Trophy, TrendingUp, ChevronRight,
  Mic, Briefcase, Calendar, Lightbulb, Clock, Inbox, CheckCircle2,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import CandidateJobsTab from './CandidateJobsTab';
import CandidateScoreTrendChart from './CandidateScoreTrendChart';
import CandidateInterviewHistory from './CandidateInterviewHistory';
import LeaderboardWidget from '@/components/ui/LeaderboardWidget';
import { useAuth } from '@/contexts/AuthContext';
import WalkthroughTrigger from '@/components/WalkthroughTrigger';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { useCreditBalance } from '@/lib/hooks/useCreditBalance';
import { isDemoMode } from '@/lib/demoMode';
import { candidateService } from '@/lib/services/interviewService';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily', label: 'Daily Practice' },
  { id: 'jobs', label: 'Opportunities' },
  { id: 'history', label: 'History' },
  { id: 'progress', label: 'Progress' },
];

const PRACTICE_TASKS = [
  {
    id: 'm1',
    title: 'Placement-Ready Self-Introduction',
    description: 'Give a 2-minute interview introduction for a software role.',
    duration: '2 min',
    href: '/interview-setup',
  },
  {
    id: 'm2',
    title: 'Technical Problem Solving',
    description: 'Walk through a data structures problem and explain your thought process.',
    duration: '5 min',
    href: '/interview-setup',
  },
  {
    id: 'm3',
    title: 'Behavioral Question Practice',
    description: 'Answer a STAR-format behavioral question about teamwork.',
    duration: '3 min',
    href: '/interview-setup',
  },
];

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface InterviewRow {
  id: string;
  status: string;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  role_alignment_score: number | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
  interview_type?: string | null;
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  color: string;
  trend?: { value: number; positive: boolean };
}

function KPICard({ icon, label, value, sub, href, color, trend }: KPICardProps) {
  return (
    <Link
      href={href}
      className="corporate-card-standard hover:shadow-md hover:border-primary/20 transition-all duration-200 group block min-h-[140px] flex flex-col justify-between"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        <ChevronRight size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <p className="text-3xl font-bold text-foreground mb-2">{value}</p>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">{label}</p>
          {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
        </div>
        {trend && (
          <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${trend.positive ? 'text-emerald-600' : 'text-red-500'}`}>
            <TrendingUp size={12} />
            {trend.positive ? '+' : ''}{trend.value}% vs prior week
          </div>
        )}
      </div>
    </Link>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-md shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#142033] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-600">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

function emptyWeekly() {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  return labels.map((day, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return { day, sessions: 0, score: 0, dateKey: d.toISOString().slice(0, 10) };
  });
}

function buildWeeklyActivity(interviews: InterviewRow[]) {
  const base = emptyWeekly();
  const byDay: Record<string, { sessions: number; scoreSum: number; scoreCount: number }> = {};
  for (const row of base) byDay[row.dateKey] = { sessions: 0, scoreSum: 0, scoreCount: 0 };

  for (const iv of interviews) {
    const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    if (!byDay[key]) continue;
    byDay[key].sessions += 1;
    if (typeof iv.overall_score === 'number') {
      byDay[key].scoreSum += iv.overall_score;
      byDay[key].scoreCount += 1;
    }
  }

  return base.map((row) => {
    const b = byDay[row.dateKey];
    return {
      day: row.day,
      sessions: b.sessions,
      score: b.scoreCount ? Math.round(b.scoreSum / b.scoreCount) : 0,
    };
  });
}

function buildSkillRadar(interviews: InterviewRow[]) {
  const scored = interviews.filter(
    (i) => i.technical_score != null || i.communication_score != null || i.role_alignment_score != null || i.overall_score != null
  );
  if (scored.length === 0) {
    return [
      { skill: 'Technical', score: 0 },
      { skill: 'Communication', score: 0 },
      { skill: 'Role Fit', score: 0 },
      { skill: 'Overall', score: 0 },
    ];
  }
  const avg = (pick: (i: InterviewRow) => number | null | undefined) => {
    const vals = scored.map(pick).filter((v): v is number => typeof v === 'number');
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
  };
  return [
    { skill: 'Technical', score: avg((i) => i.technical_score) },
    { skill: 'Communication', score: avg((i) => i.communication_score) },
    { skill: 'Role Fit', score: avg((i) => i.role_alignment_score) },
    { skill: 'Overall', score: avg((i) => i.overall_score) },
  ];
}

function buildInterviewProgress(interviews: InterviewRow[]) {
  const weeks: { week: string; interviews: number; start: Date }[] = [];
  const now = new Date();
  for (let w = 3; w >= 0; w--) {
    const start = new Date(now);
    start.setDate(now.getDate() - w * 7 - now.getDay());
    start.setHours(0, 0, 0, 0);
    weeks.push({ week: `W${4 - w}`, interviews: 0, start });
  }
  for (const iv of interviews) {
    const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
    if (!raw) continue;
    const d = new Date(raw);
    for (let i = weeks.length - 1; i >= 0; i--) {
      const end = new Date(weeks[i].start);
      end.setDate(end.getDate() + 7);
      if (d >= weeks[i].start && d < end) {
        weeks[i].interviews += 1;
        break;
      }
    }
  }
  return weeks.map(({ week, interviews }) => ({ week, interviews }));
}

function buildHeatmapData(interviews: InterviewRow[]) {
  const map: Record<string, number> = {};
  for (const iv of interviews) {
    const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
    if (!raw) continue;
    const key = new Date(raw).toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + 1;
  }
  const cells: { date: string; value: number; label?: string }[] = [];
  const now = new Date();
  for (let w = 11; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const date = new Date(now);
      date.setDate(date.getDate() - w * 7 - (6 - d));
      const key = date.toISOString().slice(0, 10);
      const value = Math.min(4, map[key] || 0);
      cells.push({
        date: key,
        value,
        label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${value} session${value !== 1 ? 's' : ''}`,
      });
    }
  }
  return cells;
}

function computeStreak(interviews: InterviewRow[]): number {
  const days = new Set<string>();
  for (const iv of interviews) {
    const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
    if (!raw) continue;
    days.add(new Date(raw).toISOString().slice(0, 10));
  }
  let streak = 0;
  const cursor = new Date();
  for (;;) {
    const key = cursor.toISOString().slice(0, 10);
    if (!days.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function computeWeekActivityFlags(interviews: InterviewRow[]): boolean[] {
  const flags = [false, false, false, false, false, false, false];
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday start
  start.setHours(0, 0, 0, 0);
  for (const iv of interviews) {
    const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
    if (!raw) continue;
    const d = new Date(raw);
    const diff = Math.floor((d.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (diff >= 0 && diff < 7) flags[diff] = true;
  }
  return flags;
}

export default function CandidateDashboardContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { user } = useAuth();
  const { balance: credits } = useCreditBalance();
  const demo = isDemoMode();

  const [interviews, setInterviews] = useState<InterviewRow[]>([]);
  const [pendingInvites, setPendingInvites] = useState(0);
  const [loading, setLoading] = useState(true);

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'there';

  useEffect(() => {
    if (!user) return;
    const key = `ga_signup_tracked_${user.id}`;
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      trackEvent('sign_up', {
        method: 'email',
        user_role: 'candidate',
        user_id: user.id,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let cancelled = false;

    const fetchData = async () => {
      try {
        const candidate = await candidateService.getByUserId(user.id);
        if (!candidate) {
          if (!cancelled) {
            setInterviews([]);
            setPendingInvites(0);
            setLoading(false);
          }
          return;
        }

        const [ivRes, bookingRes] = await Promise.all([
          supabase
            .from('interviews')
            .select('id, status, overall_score, technical_score, communication_score, role_alignment_score, scheduled_at, completed_at, created_at, interview_type')
            .eq('candidate_id', candidate.id)
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('interview_bookings')
            .select('id, confirmed')
            .eq('candidate_id', candidate.id)
            .eq('confirmed', false),
        ]);

        if (cancelled) return;

        const rows = (ivRes.data || []) as InterviewRow[];
        setInterviews(rows);
        setPendingInvites(bookingRes.data?.length || 0);

        if (
          rows.length >= 1 &&
          typeof window !== 'undefined' &&
          !localStorage.getItem(`ga_first_interview_${user.id}`)
        ) {
          trackEvent('first_interview_start', {
            user_role: 'candidate',
            user_id: user.id,
          });
          localStorage.setItem(`ga_first_interview_${user.id}`, '1');
        }
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    const channel = supabase
      .channel('candidate-dashboard-kpi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchData())
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const stats = useMemo(() => {
    const total = interviews.length;
    const completed = interviews.filter((i) => ['completed', 'evaluated'].includes(i.status)).length;
    const scheduled = interviews.filter((i) => i.status === 'scheduled').length;
    const scored = interviews.filter((i) => typeof i.overall_score === 'number');
    const avgScore = scored.length
      ? Math.round(scored.reduce((s, i) => s + (i.overall_score || 0), 0) / scored.length)
      : 0;

    const thisWeek = buildWeeklyActivity(interviews).reduce((s, d) => s + d.sessions, 0);
    const priorStart = new Date();
    priorStart.setDate(priorStart.getDate() - 14);
    const priorEnd = new Date();
    priorEnd.setDate(priorEnd.getDate() - 7);
    const priorWeek = interviews.filter((iv) => {
      const raw = iv.completed_at || iv.scheduled_at || iv.created_at;
      if (!raw) return false;
      const d = new Date(raw);
      return d >= priorStart && d < priorEnd;
    }).length;
    const trendPct = priorWeek > 0
      ? Math.round(((thisWeek - priorWeek) / priorWeek) * 100)
      : thisWeek > 0 ? 100 : 0;

    return {
      total,
      completed,
      scheduled,
      avgScore,
      streak: computeStreak(interviews),
      weekFlags: computeWeekActivityFlags(interviews),
      todayDone: computeWeekActivityFlags(interviews)[((new Date().getDay() + 6) % 7)],
      trendPct,
    };
  }, [interviews]);

  const weeklyActivity = useMemo(() => buildWeeklyActivity(interviews), [interviews]);
  const skillRadarData = useMemo(() => buildSkillRadar(interviews), [interviews]);
  const interviewProgress = useMemo(() => buildInterviewProgress(interviews), [interviews]);
  const heatmapData = useMemo(() => buildHeatmapData(interviews), [interviews]);
  const hasChartData = interviews.length > 0;

  const creditLabel = credits.loading
    ? '…'
    : (credits.remaining ?? 0).toLocaleString();
  const creditSub = credits.loading
    ? 'loading'
    : `of ${(credits.total ?? 0).toLocaleString()}`;

  return (
    <div className="fade-in corporate-container">
      <div className="flex items-start justify-between gap-6 mb-8">
        <div className="corporate-text-hierarchy">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-ai-primary rounded-xl flex items-center justify-center shadow-lg ai-glow">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">Welcome back, {firstName}</h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                AI Interview Platform • Enterprise
              </div>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed ml-13">Structured interview preparation with intelligent AI guidance and comprehensive evaluation.</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <WalkthroughTrigger role="candidate" autoStart={true} />
          <div className="flex items-center gap-2 bg-card border border-border rounded-md px-4 py-2.5">
            <Flame size={16} className="text-primary" />
            <div>
              <p className="text-base font-600 text-foreground leading-none">{stats.streak}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Day Streak</p>
            </div>
          </div>
          {pendingInvites > 0 && (
            <Link
              href="/invitations"
              className="flex items-center gap-2 bg-card border border-border rounded-md px-4 py-2.5 hover:border-primary/40 transition-colors"
            >
              <Inbox size={16} className="text-primary" />
              <div>
                <p className="text-base font-600 text-foreground leading-none">{pendingInvites}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Pending invites</p>
              </div>
            </Link>
          )}
        </div>
      </div>

      <div className="flex gap-0 border-b border-border mb-6 overflow-x-auto" data-tour="candidate-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-colors duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="corporate-section">
          <div className="corporate-grid-kpi" data-tour="candidate-kpi-grid">
            <KPICard
              icon={<Mic size={18} className="text-primary" />}
              label="Interviews"
              value={loading ? '—' : stats.total}
              sub={`${stats.completed} completed`}
              href="/interview-results"
              color="bg-secondary"
              trend={stats.trendPct !== 0 ? { value: Math.abs(stats.trendPct), positive: stats.trendPct >= 0 } : undefined}
            />
            <KPICard
              icon={<Calendar size={18} className="text-blue-600" />}
              label="Scheduled"
              value={loading ? '—' : stats.scheduled}
              sub="upcoming sessions"
              href="/invitations"
              color="bg-blue-50"
            />
            <KPICard
              icon={<Trophy size={18} className="text-primary" />}
              label="Avg Score"
              value={loading ? '—' : stats.avgScore || '—'}
              sub={stats.avgScore ? 'across evaluated' : 'no scores yet'}
              href="/interview-results"
              color="bg-secondary"
            />
            <KPICard
              icon={<Inbox size={18} className="text-amber-600" />}
              label="Invitations"
              value={loading ? '—' : pendingInvites}
              sub="awaiting response"
              href="/invitations"
              color="bg-amber-50"
            />
            <KPICard
              icon={<Award size={18} className="text-orange-600" />}
              label="Streak"
              value={loading ? '—' : stats.streak}
              sub="active days"
              href="/interview-setup"
              color="bg-orange-50"
            />
            <KPICard
              icon={<Zap size={18} className="text-primary" />}
              label="Credits"
              value={creditLabel}
              sub={creditSub}
              href="/subscription"
              color="bg-secondary"
            />
          </div>

          <div className="corporate-grid-balanced">
            <div className="corporate-card-standard">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Weekly Interview Activity</h3>
                <span className="text-[11px] text-[#5A6B82] bg-[#F4F6FA] px-2.5 py-1 rounded-lg">This Week</span>
              </div>
              {hasChartData ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyActivity} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5A6B82' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#5A6B82' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="sessions" name="Sessions" fill="#1B4F8A" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="score" name="Avg Score" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center text-center">
                  <p className="text-sm font-600 text-[#142033]">No interview activity yet</p>
                  <p className="text-xs text-[#5A6B82] mt-1 mb-3">Complete a mock interview to see your weekly chart.</p>
                  <Link href="/interview-setup" className="text-xs font-700 text-[#1B4F8A] hover:underline">Start interview</Link>
                </div>
              )}
            </div>

            <div className="corporate-card p-5">
              <h3 className="text-sm font-600 text-[#142033] mb-4">Skill Coverage</h3>
              {hasChartData && stats.avgScore > 0 ? (
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={skillRadarData}>
                    <PolarGrid stroke="#D5DDE8" />
                    <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#5A6B82' }} />
                    <Radar name="Score" dataKey="score" stroke="#1B4F8A" fill="#1B4F8A" fillOpacity={0.15} strokeWidth={2} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex flex-col items-center justify-center text-center px-4">
                  <p className="text-sm font-600 text-[#142033]">Scores appear after evaluation</p>
                  <p className="text-xs text-[#5A6B82] mt-1">Finish and evaluate an interview to unlock skill coverage.</p>
                </div>
              )}
            </div>
          </div>

          <div className="corporate-grid-balanced">
            <div className="corporate-card-standard">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-foreground">Interview Progress (4 Weeks)</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={interviewProgress}>
                  <defs>
                    <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B4F8A" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#1B4F8A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#5A6B82' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#5A6B82' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="interviews" name="Interviews" stroke="#1B4F8A" fill="url(#intGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {demo ? (
              <LeaderboardWidget compact showFullLink />
            ) : (
              <div className="corporate-card p-5 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 size={16} className="text-[#1B4F8A]" />
                  <h3 className="text-sm font-600 text-[#142033]">Next step</h3>
                </div>
                <p className="text-xs text-[#5A6B82] mb-4 leading-relaxed">
                  {pendingInvites > 0
                    ? 'You have pending invitations waiting for a response.'
                    : stats.scheduled > 0
                      ? 'You have scheduled interviews ready to start.'
                      : 'Book a slot or start a mock interview to keep progressing.'}
                </p>
                <Link
                  href={pendingInvites > 0 ? '/invitations' : stats.scheduled > 0 ? '/interview-setup' : '/book-interview'}
                  className="inline-flex items-center justify-center gap-2 bg-[#142033] hover:bg-[#162447] text-white text-sm font-700 px-4 py-2.5 rounded-md transition-colors"
                >
                  {pendingInvites > 0 ? 'Review invitations' : stats.scheduled > 0 ? 'Continue setup' : 'Book interview'}
                  <ChevronRight size={14} />
                </Link>
              </div>
            )}
          </div>

          <div className="corporate-card-standard" data-tour="quick-actions">
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Lightbulb className="w-4 h-4 ai-accent" />
              Quick Actions
            </h3>
            <div className="corporate-grid-actions">
              {[
                { label: 'AI Mock Interview', href: '/interview-setup', icon: <Mic size={18} className="ai-accent" />, color: 'corporate-card-compact hover:shadow-md border-2 border-transparent hover:border-primary/20 ai-glow' },
                { label: 'Practice Hub', href: '/practice', icon: <BookOpen size={18} className="text-blue-600" />, color: 'corporate-card-compact hover:shadow-md border-2 border-transparent hover:border-blue-200' },
                { label: 'Schedule Session', href: '/book-interview', icon: <Calendar size={18} className="text-indigo-600" />, color: 'corporate-card-compact hover:shadow-md border-2 border-transparent hover:border-indigo-200' },
                { label: 'Performance Analytics', href: '/interview-results', icon: <BarChart2 size={18} className="text-emerald-600" />, color: 'corporate-card-compact hover:shadow-md border-2 border-transparent hover:border-emerald-200' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex flex-col items-center gap-3 p-5 rounded-lg border-2 transition-all duration-200 text-center ${action.color} min-h-[120px] justify-center`}
                >
                  <div className="w-12 h-12 rounded-xl bg-white/80 backdrop-blur flex items-center justify-center shadow-sm">
                    {action.icon}
                  </div>
                  <span className="text-sm font-medium text-foreground leading-tight">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {demo ? (
            <ActivityHeatmap
              title="Practice Activity (Last 12 Weeks)"
              subtitle="Each cell represents daily practice sessions"
              colorScheme="teal"
              mode="weekly"
              data-tour="candidate-heatmap"
            />
          ) : (
            <ActivityHeatmap
              title="Interview Activity (Last 12 Weeks)"
              subtitle="Built from your real interview sessions"
              colorScheme="teal"
              mode="weekly"
              data={heatmapData}
              data-tour="candidate-heatmap"
            />
          )}
        </div>
      )}

      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-8 max-w-6xl">
          <div className="space-y-6 min-w-0">
            <div className="corporate-card-standard overflow-hidden">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-md bg-[#E8F4F8] flex items-center justify-center shrink-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#D1EAF5] flex items-center justify-center">
                      <Mic size={22} className="text-[#1B4F8A]" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-600 text-[#142033] mb-1">Start Your Daily Practice</h2>
                  <p className="text-sm text-[#5A6B82] mb-4">Open Interview Setup to run a practice session. Feedback appears after the interview is evaluated.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/interview-setup" className="inline-flex items-center gap-2 bg-[#142033] hover:bg-[#162447] text-white text-sm font-700 px-5 py-2.5 rounded-md transition-colors">
                      <Mic size={14} /> Start Practice
                    </Link>
                    <Link href="/company-interviews" className="inline-flex items-center gap-2 bg-secondary hover:bg-muted text-foreground text-sm font-600 px-5 py-2.5 rounded-md border border-border transition-colors">
                      <Briefcase size={14} /> Company Interviews
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="corporate-card">
              <div className="px-6 py-5 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Suggested Practice</h3>
                <p className="text-sm text-muted-foreground mt-1">Opens Interview Setup — pick duration and subject there.</p>
              </div>
              <div className="divide-y divide-[#F4F6FA]">
                {PRACTICE_TASKS.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors group border-b border-border last:border-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Mic size={18} className="ai-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-foreground mb-1">{task.title}</h4>
                      <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{task.description}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Clock size={12} /> {task.duration}
                        </span>
                      </div>
                    </div>
                    <Link
                      href={task.href}
                      className="flex items-center gap-1.5 bg-[#142033] hover:bg-[#162447] text-white text-xs font-700 px-4 py-2 rounded-md transition-colors shrink-0"
                    >
                      Practice Now <ChevronRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <CandidateScoreTrendChart />
          </div>

          <div className="space-y-6">
            <div className="corporate-card-standard">
              <h4 className="text-base font-semibold text-foreground mb-2">Today's Goal</h4>
              <p className="text-sm text-muted-foreground mb-4">Complete 1 practice session</p>
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 h-3 bg-secondary rounded-full overflow-hidden mr-4">
                  <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: stats.todayDone ? '100%' : '0%' }} />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{stats.todayDone ? 1 : 0} / 1</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 mt-4">
                <Zap size={16} className="ai-accent shrink-0" />
                <p className="text-sm text-emerald-700 font-medium">
                  {stats.todayDone ? 'Goal complete for today!' : 'One focused practice completes today\'s goal.'}
                </p>
              </div>
            </div>

            <div className="corporate-card-standard">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={16} className="ai-accent" />
                <h4 className="text-base font-semibold text-foreground">Your Streak</h4>
              </div>
              <div className="grid grid-cols-7 gap-2 mb-4">
                {weekDays.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <span className="text-[10px] text-[#5A6B82] font-600">{day}</span>
                    <div className={`w-7 h-7 rounded-full border-2 ${
                      stats.weekFlags[i]
                        ? 'bg-[#1B4F8A] border-[#1B4F8A]'
                        : 'bg-[#F0F2F5] border-border'
                    }`} />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#5A6B82] text-center">
                {stats.streak > 0
                  ? `${stats.streak}-day streak — keep it going.`
                  : 'Complete today\'s practice to start your streak.'}
              </p>
            </div>

            <div className="corporate-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={15} className="text-amber-500" />
                <h4 className="text-sm font-600 text-[#142033]">Interview Tip</h4>
              </div>
              <p className="text-xs text-[#5A6B82] leading-relaxed">Speak clearly, use short pauses between ideas, and support key points with one concrete example.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && <CandidateJobsTab />}
      {activeTab === 'history' && <CandidateInterviewHistory />}
      {activeTab === 'progress' && (
        <div className="space-y-5">
          <CandidateScoreTrendChart />
          {demo ? <LeaderboardWidget showFullLink /> : null}
        </div>
      )}
    </div>
  );
}
