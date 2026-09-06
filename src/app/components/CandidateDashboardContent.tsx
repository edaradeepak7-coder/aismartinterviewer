'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Flame, Star, BarChart2, BookOpen, Target, Award, Zap, Trophy, TrendingUp, ChevronRight, Mic, Briefcase, Calendar, Lightbulb, Clock, Circle, Code2 } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
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

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'daily', label: 'Daily Practice' },
  { id: 'jobs', label: 'Opportunities' },
  { id: 'history', label: 'History' },
  { id: 'progress', label: 'Progress' },
];

// ─── Mock analytics data ──────────────────────────────────────────────────────
const weeklyActivity = [
  { day: 'Mon', sessions: 2, score: 72 },
  { day: 'Tue', sessions: 1, score: 68 },
  { day: 'Wed', sessions: 3, score: 78 },
  { day: 'Thu', sessions: 0, score: 0 },
  { day: 'Fri', sessions: 2, score: 81 },
  { day: 'Sat', sessions: 1, score: 75 },
  { day: 'Sun', sessions: 0, score: 0 },
];

const skillRadarData = [
  { skill: 'Technical', score: 72 },
  { skill: 'Communication', score: 85 },
  { skill: 'Problem Solving', score: 68 },
  { skill: 'Behavioral', score: 78 },
  { skill: 'System Design', score: 55 },
  { skill: 'Coding', score: 63 },
];

const learningProgress = [
  { week: 'W1', courses: 1, assessments: 2, interviews: 1 },
  { week: 'W2', courses: 2, assessments: 3, interviews: 2 },
  { week: 'W3', courses: 1, assessments: 1, interviews: 3 },
  { week: 'W4', courses: 3, assessments: 4, interviews: 2 },
];

const dailyMissions = [
  {
    id: 'm1',
    title: 'Placement-Ready Self-Introduction',
    description: 'Give a 2-minute interview introduction for a software role.',
    xp: 50,
    completed: false,
    type: 'interview',
    duration: '2 min',
    attempts: 2,
  },
  {
    id: 'm2',
    title: 'Technical Problem Solving',
    description: 'Walk through a data structures problem and explain your thought process.',
    xp: 40,
    completed: false,
    type: 'practice',
    duration: '5 min',
    attempts: 0,
  },
  {
    id: 'm3',
    title: 'Behavioral Question Practice',
    description: 'Answer a STAR-format behavioral question about teamwork.',
    xp: 30,
    completed: false,
    type: 'review',
    duration: '3 min',
    attempts: 1,
  },
];

const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// ─── KPI Cards ────────────────────────────────────────────────────────────────
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
      className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5 hover:shadow-md hover:border-[#0D9488]/30 transition-all duration-200 group block"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <ChevronRight size={14} className="text-[#6B7A99] group-hover:text-[#0D9488] transition-colors mt-1" />
      </div>
      <p className="text-2xl font-800 text-[#0D1B3E] mb-0.5">{value}</p>
      <p className="text-xs font-600 text-[#6B7A99]">{label}</p>
      {sub && <p className="text-[11px] text-[#6B7A99] mt-0.5">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[11px] font-600 ${trend.positive ? 'text-teal-600' : 'text-red-500'}`}>
          <TrendingUp size={10} />
          {trend.positive ? '+' : '-'}{trend.value}% this week
        </div>
      )}
    </Link>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-600">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export default function CandidateDashboardContent() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const { user } = useAuth();
  const [liveKPIs, setLiveKPIs] = useState({
    courses: 0,
    assessments: 0,
    interviews: 0,
    avgScore: 0,
    certificates: 0,
    achievements: 0,
    credits: 0,
    streak: 0,
    stars: 0,
    rank: '—',
  });

  const firstName = user?.user_metadata?.full_name?.split(' ')[0]
    || user?.email?.split('@')[0]
    || 'Jordan';

  // ── GA: track signup event once per session ──────────────────────────────
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

  // ── GA: track first interview start ─────────────────────────────────────
  const hasTrackedFirstInterview = React.useRef(false);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    const fetchKPIs = async () => {
      try {
        const [interviewCountResult, interviewsResult] = await Promise.all([
          supabase.from('interviews').select('*', { count: 'exact', head: true }),
          supabase.from('interviews').select('overall_score').eq('status', 'evaluated').not('overall_score', 'is', null),
        ]);
        const interviewCount = interviewCountResult.count;
        const interviews = interviewsResult.data;

        const avgScore = interviews && interviews.length > 0
          ? Math.round(interviews.reduce((s: number, iv: any) => s + (iv.overall_score || 0), 0) / interviews.length)
          : 0;

        // GA: track first interview start when count goes from 0 to ≥1
        if (
          !hasTrackedFirstInterview.current &&
          interviewCount !== null &&
          interviewCount >= 1 &&
          typeof window !== 'undefined' &&
          !localStorage.getItem(`ga_first_interview_${user.id}`)
        ) {
          trackEvent('first_interview_start', {
            user_role: 'candidate',
            user_id: user.id,
          });
          localStorage.setItem(`ga_first_interview_${user.id}`, '1');
          hasTrackedFirstInterview.current = true;
        }

        setLiveKPIs(prev => ({
          ...prev,
          interviews: interviewCount || 0,
          avgScore,
        }));
      } catch (err) {
        console.error('Dashboard KPI error:', err);
      }
    };

    fetchKPIs();

    const channel = supabase
      .channel('candidate-dashboard-kpi')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'interviews' }, () => fetchKPIs())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <div className="fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Welcome back, {firstName} 👋</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Your AI-powered learning & interview preparation platform</p>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <WalkthroughTrigger role="candidate" autoStart={true} />
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Flame size={16} className="text-orange-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">0</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Day Streak</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Star size={16} className="text-amber-400" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">32</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Stars</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Trophy size={16} className="text-amber-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">#5</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Rank</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4] mb-6 overflow-x-auto" data-tour="candidate-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" data-tour="candidate-kpi-grid">
            <KPICard
              icon={<BookOpen size={18} className="text-blue-600" />}
              label="Courses"
              value="3"
              sub="2 in progress"
              href="/practice"
              color="bg-blue-50"
              trend={{ value: 12, positive: true }}
            />
            <KPICard
              icon={<Target size={18} className="text-violet-600" />}
              label="Assessments"
              value="8"
              sub="5 passed"
              href="/assessments"
              color="bg-violet-50"
              trend={{ value: 8, positive: true }}
            />
            <KPICard
              icon={<Mic size={18} className="text-teal-600" />}
              label="Mock Interviews"
              value="12"
              sub="Avg score: 76%"
              href="/interview-setup"
              color="bg-teal-50"
              trend={{ value: 5, positive: true }}
            />
            <KPICard
              icon={<Award size={18} className="text-amber-600" />}
              label="Certificates"
              value="2"
              sub="1 pending"
              href="/progress-center"
              color="bg-amber-50"
            />
            <KPICard
              icon={<Trophy size={18} className="text-orange-600" />}
              label="Achievements"
              value="14"
              sub="3 new this week"
              href="/progress-center"
              color="bg-orange-50"
            />
            <KPICard
              icon={<Zap size={18} className="text-teal-600" />}
              label="Credits"
              value="18,160"
              sub="of 50,000"
              href="/subscription"
              color="bg-teal-50"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Weekly Activity */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-800 text-[#0D1B3E]">Weekly Learning Activity</h3>
                <span className="text-[11px] text-[#6B7A99] bg-[#F4F6FA] px-2.5 py-1 rounded-lg">This Week</span>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={weeklyActivity} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="sessions" name="Sessions" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="score" name="Score" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Skill Radar */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Skill Coverage</h3>
              <ResponsiveContainer width="100%" height={180}>
                <RadarChart data={skillRadarData}>
                  <PolarGrid stroke="#E8ECF4" />
                  <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: '#6B7A99' }} />
                  <Radar name="Score" dataKey="score" stroke="#0D9488" fill="#0D9488" fillOpacity={0.15} strokeWidth={2} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Learning Progress + Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Learning Progress Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-800 text-[#0D1B3E]">Learning Progress (4 Weeks)</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={learningProgress}>
                  <defs>
                    <linearGradient id="courseGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="assessGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="intGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  <Area type="monotone" dataKey="courses" name="Courses" stroke="#3B82F6" fill="url(#courseGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="assessments" name="Assessments" stroke="#8B5CF6" fill="url(#assessGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="interviews" name="Interviews" stroke="#0D9488" fill="url(#intGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Leaderboard Widget */}
            <LeaderboardWidget compact showFullLink />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5" data-tour="quick-actions">
            <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Start Mock Interview', href: '/interview-setup', icon: <Mic size={18} className="text-teal-600" />, color: 'bg-teal-50 border-teal-100 hover:border-teal-300' },
                { label: 'Practice Hub', href: '/practice', icon: <BookOpen size={18} className="text-blue-600" />, color: 'bg-blue-50 border-blue-100 hover:border-blue-300' },
                { label: 'Coding Arena', href: '/coding-assessment', icon: <Code2 size={18} className="text-violet-600" />, color: 'bg-violet-50 border-violet-100 hover:border-violet-300' },
                { label: 'Progress Center', href: '/progress-center', icon: <BarChart2 size={18} className="text-amber-600" />, color: 'bg-amber-50 border-amber-100 hover:border-amber-300' },
              ].map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 text-center ${action.color}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm">
                    {action.icon}
                  </div>
                  <span className="text-xs font-700 text-[#0D1B3E]">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Activity Heatmap */}
          <ActivityHeatmap
            title="Practice Activity (Last 12 Weeks)"
            subtitle="Each cell represents daily practice sessions"
            colorScheme="teal"
            mode="weekly"
            data-tour="candidate-heatmap"
          />
        </div>
      )}

      {/* ── DAILY PRACTICE TAB ── */}
      {activeTab === 'daily' && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6">
          <div className="space-y-5 min-w-0">
            {/* Hero Card */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm overflow-hidden">
              <div className="p-6 flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-[#D1EAF5] flex items-center justify-center">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#0D9488] flex items-center justify-center">
                      <Mic size={11} className="text-white" />
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-800 text-[#0D1B3E] mb-1">Start Your Daily Practice</h2>
                  <p className="text-sm text-[#6B7A99] mb-4">Record your response and get instant AI feedback to improve your interview skills.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link href="/interview-setup" className="inline-flex items-center gap-2 bg-[#0D1B3E] hover:bg-[#162447] text-white text-sm font-700 px-5 py-2.5 rounded-xl transition-colors">
                      <Mic size={14} /> Start Practice
                    </Link>
                    <Link href="/company-interviews" className="inline-flex items-center gap-2 bg-white hover:bg-[#F4F6FA] text-[#0D1B3E] text-sm font-600 px-5 py-2.5 rounded-xl border border-[#DDE3EE] transition-colors">
                      <Briefcase size={14} /> Company Interviews
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            {/* Today's Tasks */}
            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm">
              <div className="px-5 py-4 border-b border-[#E8ECF4]">
                <h3 className="text-base font-800 text-[#0D1B3E]">Today&apos;s Practice Tasks</h3>
              </div>
              <div className="divide-y divide-[#F4F6FA]">
                {dailyMissions.map((mission) => (
                  <div key={mission.id} className="flex items-center gap-4 px-5 py-4 hover:bg-[#F8FAFC] transition-colors group">
                    <div className="w-9 h-9 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
                      <Mic size={16} className="text-[#0D9488]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-700 text-[#0D1B3E]">{mission.title}</p>
                        <span className="text-[10px] font-700 bg-[#E8F4F8] text-[#0D9488] px-2 py-0.5 rounded-full">Daily</span>
                      </div>
                      <p className="text-xs text-[#6B7A99] line-clamp-1">{mission.description}</p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-[#6B7A99]"><Clock size={10} /> {mission.duration}</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#6B7A99]"><Circle size={10} /> {mission.attempts} attempts</span>
                        <span className="flex items-center gap-1 text-[11px] text-[#6B7A99]"><Calendar size={10} /> Today</span>
                      </div>
                    </div>
                    <Link
                      href="/interview-setup"
                      className="flex items-center gap-1.5 bg-[#0D1B3E] hover:bg-[#162447] text-white text-xs font-700 px-4 py-2 rounded-xl transition-colors shrink-0"
                    >
                      Practice Now <ChevronRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <CandidateScoreTrendChart />
          </div>

          {/* Right Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <h4 className="text-sm font-800 text-[#0D1B3E] mb-1">Today&apos;s Goal</h4>
              <p className="text-xs text-[#6B7A99] mb-3">Complete 1 practice session</p>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex-1 h-2 bg-[#F0F2F5] rounded-full overflow-hidden mr-3">
                  <div className="h-full bg-[#0D9488] rounded-full" style={{ width: '0%' }} />
                </div>
                <span className="text-xs font-700 text-[#6B7A99] shrink-0">0 / 1</span>
              </div>
              <div className="flex items-center gap-2 bg-[#F0FDFB] border border-[#CCFBF1] rounded-xl px-3 py-2.5 mt-3">
                <Zap size={13} className="text-[#0D9488] shrink-0" />
                <p className="text-[11px] text-[#0D9488] font-600">One focused practice completes today&apos;s goal.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-4">
                <Calendar size={15} className="text-[#0D9488]" />
                <h4 className="text-sm font-800 text-[#0D1B3E]">Your Streak</h4>
              </div>
              <div className="grid grid-cols-7 gap-1 mb-3">
                {weekDays.map((day, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <span className="text-[10px] text-[#6B7A99] font-600">{day}</span>
                    <div className="w-7 h-7 rounded-full bg-[#F0F2F5] border-2 border-[#E8ECF4]" />
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-[#6B7A99] text-center">Complete today&apos;s practice to start your streak.</p>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8ECF4] shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb size={15} className="text-amber-500" />
                <h4 className="text-sm font-800 text-[#0D1B3E]">AI Interview Tip</h4>
              </div>
              <p className="text-xs text-[#6B7A99] leading-relaxed">Speak clearly, use short pauses between ideas, and support key points with one concrete example.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'jobs' && <CandidateJobsTab />}
      {activeTab === 'history' && <CandidateInterviewHistory />}
      {activeTab === 'progress' && (
        <div className="space-y-5">
          <CandidateScoreTrendChart />
          <LeaderboardWidget showFullLink />
        </div>
      )}
    </div>
  );
}