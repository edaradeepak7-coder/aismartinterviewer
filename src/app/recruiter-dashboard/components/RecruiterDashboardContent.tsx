'use client';
import React, { useState, useEffect } from 'react';
import RecruiterKPIGrid from './RecruiterKPIGrid';
import RecruiterChartsRow from './RecruiterChartsRow';
import RecentInterviewsTable from './RecentInterviewsTable';
import RecruiterActivityFeed from './RecruiterActivityFeed';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Users, BarChart2, TrendingUp, Download, Plus, Search, Filter, Tag, Calendar, X, Bookmark, BookmarkCheck, Target, Clock, Mail, Building2, CheckCircle2, RefreshCw, Upload, ClipboardCheck } from 'lucide-react';
import WalkthroughTrigger from '@/components/WalkthroughTrigger';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { createClient } from '@/lib/supabase/client';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Link from 'next/link';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidate-search', label: 'Candidate Search' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

interface Candidate {
  id: number;
  name: string;
  email: string;
  role: string;
  skills: string[];
  score: number;
  experience: string;
  location: string;
  status: 'available' | 'interviewing' | 'placed';
  saved: boolean;
  tags: string[];
  lastActive: string;
  interviewsCompleted: number;
}

const mockCandidates: Candidate[] = [
  { id: 1, name: 'Arjun Mehta', email: 'arjun@email.com', role: 'Frontend Developer', skills: ['React', 'TypeScript', 'CSS', 'Node.js'], score: 92, experience: '3 years', location: 'Bangalore', status: 'available', saved: false, tags: ['top-performer', 'react-expert'], lastActive: '2h ago', interviewsCompleted: 8 },
  { id: 2, name: 'Priya Nair', email: 'priya@email.com', role: 'Full Stack Developer', skills: ['React', 'Python', 'Django', 'PostgreSQL'], score: 88, experience: '4 years', location: 'Mumbai', status: 'available', saved: true, tags: ['python-expert'], lastActive: '1d ago', interviewsCompleted: 6 },
  { id: 3, name: 'Rahul Sharma', email: 'rahul@email.com', role: 'Backend Engineer', skills: ['Java', 'Spring Boot', 'Microservices', 'AWS'], score: 85, experience: '5 years', location: 'Hyderabad', status: 'interviewing', saved: false, tags: ['java-expert', 'cloud'], lastActive: '3h ago', interviewsCompleted: 10 },
  { id: 4, name: 'Sneha Pillai', email: 'sneha@email.com', role: 'Data Engineer', skills: ['Python', 'SQL', 'Spark', 'Kafka'], score: 90, experience: '3 years', location: 'Pune', status: 'available', saved: true, tags: ['data-expert'], lastActive: '5h ago', interviewsCompleted: 7 },
  { id: 5, name: 'Vikram Reddy', email: 'vikram@email.com', role: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform'], score: 87, experience: '4 years', location: 'Chennai', status: 'available', saved: false, tags: ['devops', 'cloud'], lastActive: '2d ago', interviewsCompleted: 5 },
  { id: 6, name: 'Ananya Krishnan', email: 'ananya@email.com', role: 'Frontend Developer', skills: ['React', 'Vue.js', 'TypeScript', 'GraphQL'], score: 83, experience: '2 years', location: 'Bangalore', status: 'available', saved: false, tags: ['frontend'], lastActive: '1h ago', interviewsCompleted: 4 },
  { id: 7, name: 'Karan Gupta', email: 'karan@email.com', role: 'ML Engineer', skills: ['Python', 'TensorFlow', 'PyTorch', 'MLOps'], score: 94, experience: '3 years', location: 'Delhi', status: 'interviewing', saved: true, tags: ['ml-expert', 'top-performer'], lastActive: '4h ago', interviewsCompleted: 9 },
  { id: 8, name: 'Meera Joshi', email: 'meera@email.com', role: 'Backend Engineer', skills: ['Node.js', 'MongoDB', 'Redis', 'GraphQL'], score: 81, experience: '2 years', location: 'Mumbai', status: 'available', saved: false, tags: ['nodejs'], lastActive: '6h ago', interviewsCompleted: 3 },
];

const ALL_SKILLS = ['React', 'TypeScript', 'Python', 'Java', 'Node.js', 'AWS', 'Docker', 'SQL', 'GraphQL', 'Vue.js', 'Spring Boot', 'PostgreSQL'];
const ALL_ROLES = ['Frontend Developer', 'Full Stack Developer', 'Backend Engineer', 'Data Engineer', 'DevOps Engineer', 'ML Engineer'];
const ALL_TAGS = ['top-performer', 'react-expert', 'python-expert', 'java-expert', 'cloud', 'data-expert', 'devops', 'ml-expert', 'frontend', 'nodejs'];

const PIPELINE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

function SkillBadge({ skill }: { skill: string }) {
  return <span className="px-2 py-0.5 bg-[#F4F6FA] text-[#6B7A99] text-[10px] font-600 rounded-md border border-[#E8ECF4]">{skill}</span>;
}

function StatusBadge({ status }: { status: Candidate['status'] }) {
  const map = { available: 'bg-emerald-50 text-emerald-700', interviewing: 'bg-blue-50 text-blue-700', placed: 'bg-violet-50 text-violet-700' };
  return <span className={`px-2 py-0.5 text-[10px] font-700 rounded-full ${map[status]}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-600">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────
function PipelineTab() {
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [stageBreakdown, setStageBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchPipeline() {
      try {
        const supabase = createClient();
        const { data: interviews } = await supabase
          .from('interviews')
          .select('status, role, overall_score, created_at, recommendation')
          .order('created_at', { ascending: false });

        if (!interviews) throw new Error('no data');

        const statusCounts: Record<string, number> = {};
        interviews.forEach(iv => {
          statusCounts[iv.status] = (statusCounts[iv.status] || 0) + 1;
        });

        const stages = [
          { stage: 'Scheduled', count: statusCounts['scheduled'] || 0, color: '#3B82F6' },
          { stage: 'In Progress', count: statusCounts['in_progress'] || 0, color: '#F59E0B' },
          { stage: 'Completed', count: statusCounts['completed'] || 0, color: '#0D9488' },
          { stage: 'Evaluated', count: statusCounts['evaluated'] || 0, color: '#8B5CF6' },
          { stage: 'Archived', count: statusCounts['archived'] || 0, color: '#6B7A99' },
        ];

        // Role distribution
        const roleCounts: Record<string, number> = {};
        interviews.forEach(iv => {
          if (iv.role) roleCounts[iv.role] = (roleCounts[iv.role] || 0) + 1;
        });
        const roleData = Object.entries(roleCounts).slice(0, 6).map(([name, value]) => ({ name, value }));

        if (!cancelled) {
          setPipelineData(stages);
          setStageBreakdown(roleData);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPipelineData([
            { stage: 'Scheduled', count: 24, color: '#3B82F6' },
            { stage: 'In Progress', count: 8, color: '#F59E0B' },
            { stage: 'Completed', count: 47, color: '#0D9488' },
            { stage: 'Evaluated', count: 31, color: '#8B5CF6' },
            { stage: 'Archived', count: 12, color: '#6B7A99' },
          ]);
          setStageBreakdown([
            { name: 'Frontend Dev', value: 28 },
            { name: 'Backend Eng', value: 22 },
            { name: 'Full Stack', value: 18 },
            { name: 'DevOps', value: 12 },
            { name: 'ML Engineer', value: 10 },
            { name: 'Data Eng', value: 10 },
          ]);
          setLoading(false);
        }
      }
    }
    fetchPipeline();
    return () => { cancelled = true; };
  }, []);

  const total = pipelineData.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-800 text-[#0D1B3E]">Hiring Pipeline</h2>
        {loading && <RefreshCw size={14} className="text-[#6B7A99] animate-spin" />}
      </div>

      {/* Stage KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {pipelineData.map(stage => (
          <div key={stage.stage} className="bg-white border border-[#E8ECF4] rounded-xl p-4 text-center shadow-sm">
            <p className="text-2xl font-800 text-[#0D1B3E]">{stage.count}</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">{stage.stage}</p>
            <div className="mt-2 h-1 rounded-full" style={{ backgroundColor: stage.color, opacity: 0.3 }}>
              <div className="h-full rounded-full" style={{ backgroundColor: stage.color, width: total > 0 ? `${(stage.count / total) * 100}%` : '0%' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Pipeline Stage Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pipelineData} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="stage" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Candidates by Role</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={stageBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {stageBreakdown.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PIPELINE_COLORS[index % PIPELINE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pipeline funnel */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {pipelineData.map((stage, i) => {
            const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
            return (
              <div key={stage.stage} className="flex items-center gap-4">
                <span className="text-xs font-600 text-[#6B7A99] w-24 shrink-0">{stage.stage}</span>
                <div className="flex-1 h-6 bg-[#F4F6FA] rounded-lg overflow-hidden">
                  <div className="h-full rounded-lg flex items-center px-2 transition-all" style={{ width: `${Math.max(5, pct)}%`, backgroundColor: stage.color }}>
                    <span className="text-[10px] font-700 text-white">{stage.count}</span>
                  </div>
                </div>
                <span className="text-xs font-700 text-[#0D1B3E] w-10 text-right">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [scoreData, setScoreData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [kpis, setKpis] = useState({ totalInterviews: 0, avgScore: 0, completionRate: 0, topPerformers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function fetchAnalytics() {
      try {
        const supabase = createClient();
        const { data: interviews } = await supabase
          .from('interviews')
          .select('status, overall_score, technical_score, communication_score, role_alignment_score, created_at, interview_type')
          .order('created_at', { ascending: true });

        if (!interviews) throw new Error('no data');

        const completed = interviews.filter(iv => iv.status === 'completed' || iv.status === 'evaluated');
        const total = interviews.length;
        const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
        const scores = completed.map(iv => iv.overall_score).filter(Boolean);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const topPerformers = scores.filter(s => s >= 80).length;

        // Score distribution buckets
        const buckets = [
          { range: '0-40', count: 0, fill: '#EF4444' },
          { range: '41-60', count: 0, fill: '#F59E0B' },
          { range: '61-75', count: 0, fill: '#3B82F6' },
          { range: '76-90', count: 0, fill: '#0D9488' },
          { range: '91-100', count: 0, fill: '#8B5CF6' },
        ];
        scores.forEach(s => {
          if (s <= 40) buckets[0].count++;
          else if (s <= 60) buckets[1].count++;
          else if (s <= 75) buckets[2].count++;
          else if (s <= 90) buckets[3].count++;
          else buckets[4].count++;
        });

        // Weekly trend
        const weekMap: Record<string, { week: string; interviews: number; avgScore: number; scores: number[] }> = {};
        interviews.forEach(iv => {
          const d = new Date(iv.created_at);
          const weekNum = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
          const weekKey = `W${Math.max(1, 5 - weekNum)}`;
          if (!weekMap[weekKey]) weekMap[weekKey] = { week: weekKey, interviews: 0, avgScore: 0, scores: [] };
          weekMap[weekKey].interviews++;
          if (iv.overall_score) weekMap[weekKey].scores.push(iv.overall_score);
        });
        const trend = Object.values(weekMap).map(w => ({
          week: w.week,
          interviews: w.interviews,
          avgScore: w.scores.length > 0 ? Math.round(w.scores.reduce((a, b) => a + b, 0) / w.scores.length) : 0,
        })).sort((a, b) => a.week.localeCompare(b.week));

        if (!cancelled) {
          setKpis({ totalInterviews: total, avgScore, completionRate, topPerformers });
          setScoreData(buckets);
          setTrendData(trend.length > 0 ? trend : getFallbackTrend());
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setKpis({ totalInterviews: 122, avgScore: 78, completionRate: 74, topPerformers: 43 });
          setScoreData([
            { range: '0-40', count: 4, fill: '#EF4444' },
            { range: '41-60', count: 12, fill: '#F59E0B' },
            { range: '61-75', count: 28, fill: '#3B82F6' },
            { range: '76-90', count: 38, fill: '#0D9488' },
            { range: '91-100', count: 18, fill: '#8B5CF6' },
          ]);
          setTrendData(getFallbackTrend());
          setLoading(false);
        }
      }
    }
    fetchAnalytics();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-800 text-[#0D1B3E]">Recruiter Analytics</h2>
        {loading && <RefreshCw size={14} className="text-[#6B7A99] animate-spin" />}
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Interviews', value: kpis.totalInterviews.toLocaleString(), icon: <BarChart2 size={16} className="text-teal-600" />, bg: 'bg-teal-50' },
          { label: 'Avg Score', value: `${kpis.avgScore}%`, icon: <TrendingUp size={16} className="text-violet-600" />, bg: 'bg-violet-50' },
          { label: 'Completion Rate', value: `${kpis.completionRate}%`, icon: <CheckCircle2 size={16} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'Top Performers', value: kpis.topPerformers.toLocaleString(), icon: <Users size={16} className="text-amber-600" />, bg: 'bg-amber-50' },
        ].map(kpi => (
          <div key={kpi.label} className={`bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm ${loading ? 'animate-pulse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-2`}>{kpi.icon}</div>
            <p className="text-xl font-800 text-[#0D1B3E]">{loading ? '—' : kpi.value}</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={scoreData} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Candidates" radius={[4, 4, 0, 0]}>
                {scoreData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-800 text-[#0D1B3E] mb-4">Weekly Interview Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="interviewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="interviews" name="Interviews" stroke="#0D9488" fill="url(#interviewGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke="#8B5CF6" fill="url(#scoreGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function getFallbackTrend() {
  return [
    { week: 'W1', interviews: 18, avgScore: 72 },
    { week: 'W2', interviews: 24, avgScore: 75 },
    { week: 'W3', interviews: 31, avgScore: 78 },
    { week: 'W4', interviews: 28, avgScore: 80 },
    { week: 'W5', interviews: 21, avgScore: 77 },
  ];
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RecruiterDashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [candidates, setCandidates] = useState<Candidate[]>(mockCandidates);
  const [skillSearch, setSkillSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [tagModal, setTagModal] = useState<number | null>(null);
  const [newTag, setNewTag] = useState('');
  const [bulkScheduleModal, setBulkScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const { user } = useAuth();

  // ── GA: track recruiter signup once per session ──────────────────────────
  useEffect(() => {
    if (!user) return;
    const key = `ga_signup_tracked_${user.id}`;
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      trackEvent('sign_up', {
        method: 'email',
        user_role: 'recruiter',
        user_id: user.id,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user]);

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const toggleSaved = (id: number) => setCandidates(prev => prev.map(c => c.id === id ? { ...c, saved: !c.saved } : c));
  const toggleSelect = (id: number) => setSelectedCandidates(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const clearSelection = () => setSelectedCandidates([]);

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !skillSearch || c.name.toLowerCase().includes(skillSearch.toLowerCase()) || c.skills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase()));
    const matchRole = !roleFilter || c.role === roleFilter;
    const matchScore = c.score >= minScore;
    const matchSkills = selectedSkills.length === 0 || selectedSkills.every(s => c.skills.includes(s));
    return matchSearch && matchRole && matchScore && matchSkills;
  });

  const addTag = (candidateId: number) => {
    if (!newTag.trim()) return;
    setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, tags: [...c.tags, newTag.trim().toLowerCase().replace(/\s+/g, '-')] } : c));
    setNewTag('');
    setTagModal(null);
  };

  const selectAll = () => setSelectedCandidates(filteredCandidates.map(c => c.id));

  // ── GA: track recruiter signup once per session ──────────────────────────
  useEffect(() => {
    if (!user) return;
    const key = `ga_signup_tracked_${user.id}`;
    if (typeof window !== 'undefined' && !sessionStorage.getItem(key)) {
      trackEvent('sign_up', {
        method: 'email',
        user_role: 'recruiter',
        user_id: user.id,
      });
      sessionStorage.setItem(key, '1');
    }
  }, [user]);

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <Users size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Recruiter Dashboard</h1>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <WalkthroughTrigger role="recruiter" autoStart={true} />
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Users size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{candidates.filter(c => c.status === 'available').length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Available</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Bookmark size={16} className="text-amber-500" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{candidates.filter(c => c.saved).length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Saved</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <TrendingUp size={16} className="text-amber-400" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E]">{Math.round(candidates.reduce((s, c) => s + c.score, 0) / candidates.length)}%</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Avg Score</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-none" data-tour="recruiter-tabs">
        {TABS.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={['px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap',
              activeTab === tab.id ? 'border-[#0D9488] text-[#0D9488]' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.label}
          </button>
        ))}
        <div className="flex-1" />
        <div className="flex items-center gap-2 pb-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors bg-white">
            <Download size={14} /> Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors">
            <Plus size={14} /> New Job
          </button>
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Bulk Import', desc: 'Import candidates from CSV', href: '/recruiter-bulk-import', icon: <Upload size={18} />, color: 'text-blue-500 bg-blue-500/10' },
              { label: 'Structured Feedback', desc: 'Rate competencies & decide', href: '/recruiter-structured-feedback', icon: <ClipboardCheck size={18} />, color: 'text-emerald-500 bg-emerald-500/10' },
              { label: 'Live Interview', desc: 'Start a live session', href: '/recruiter-interview', icon: <BarChart2 size={18} />, color: 'text-violet-500 bg-violet-500/10' },
              { label: 'Calendar', desc: 'Manage interview slots', href: '/recruiter-calendar', icon: <Calendar size={18} />, color: 'text-amber-500 bg-amber-500/10' },
            ].map(action => (
              <Link key={action.label} href={action.href} className="bg-white border border-[#E8ECF4] rounded-xl p-4 hover:shadow-md transition-all group flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${action.color}`}>
                  {action.icon}
                </div>
                <div>
                  <p className="text-[13px] font-700 text-[#0D1B3E] group-hover:text-[#0D9488] transition-colors">{action.label}</p>
                  <p className="text-[11px] text-[#6B7A99] mt-0.5">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
          <div data-tour="recruiter-kpi">
            <ErrorBoundary componentName="KPI Grid"><RecruiterKPIGrid /></ErrorBoundary>
          </div>
          <ErrorBoundary componentName="Charts"><RecruiterChartsRow /></ErrorBoundary>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <ErrorBoundary componentName="Recent Interviews"><RecentInterviewsTable /></ErrorBoundary>
            </div>
            <div>
              <ErrorBoundary componentName="Activity Feed"><RecruiterActivityFeed /></ErrorBoundary>
            </div>
          </div>
          <ActivityHeatmap
            title="Interview Activity Heatmap"
            subtitle="Scheduled interviews by day and hour across the past 12 weeks"
            colorScheme="blue"
            mode="weekly"
            data-tour="recruiter-heatmap"
          />
        </>
      )}

      {/* Candidate Search Tab */}
      {activeTab === 'candidate-search' && (
        <div className="space-y-5" data-tour="candidate-search-tab">
          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                <input value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="Search by name or skill..." className="w-full pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
              </div>
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="text-sm border border-[#E8ECF4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 text-[#6B7A99]">
                <option value="">All Roles</option>
                {ALL_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex items-center gap-2">
                <Target size={14} className="text-[#6B7A99]" />
                <span className="text-xs text-[#6B7A99]">Min Score:</span>
                <input type="range" min={0} max={100} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="w-24 accent-[#0D9488]" />
                <span className="text-xs font-700 text-[#0D9488] w-8">{minScore}%</span>
              </div>
            </div>
            <div>
              <p className="text-xs font-700 text-[#6B7A99] mb-2">Filter by Skills:</p>
              <div className="flex flex-wrap gap-2">
                {ALL_SKILLS.map(skill => (
                  <button key={skill} onClick={() => toggleSkill(skill)}
                    className={`px-2.5 py-1 text-xs font-600 rounded-lg border transition-all ${selectedSkills.includes(skill) ? 'bg-[#0D9488] text-white border-[#0D9488]' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:border-[#0D9488] hover:text-[#0D9488]'}`}>
                    {skill}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedCandidates.length > 0 && (
            <div className="flex items-center gap-3 bg-[#0D9488]/10 border border-[#0D9488]/20 rounded-xl px-4 py-3">
              <span className="text-sm font-700 text-[#0D9488]">{selectedCandidates.length} selected</span>
              <div className="flex-1" />
              <button onClick={() => setBulkScheduleModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-[#0D9488] text-white rounded-lg hover:bg-[#0B8076] transition-colors">
                <Calendar size={14} /> Bulk Schedule Interview
              </button>
              <button onClick={() => {}} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-white border border-[#E8ECF4] text-[#0D1B3E] rounded-lg hover:bg-[#F4F6FA] transition-colors">
                <Mail size={14} /> Bulk Email
              </button>
              <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/50 text-[#6B7A99] transition-colors"><X size={14} /></button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7A99]"><span className="font-700 text-[#0D1B3E]">{filteredCandidates.length}</span> candidates found</p>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-600 text-[#0D9488] hover:underline">Select All</button>
              {selectedCandidates.length > 0 && <button onClick={clearSelection} className="text-xs font-600 text-[#6B7A99] hover:underline">Clear</button>}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className={`bg-white border rounded-xl p-5 transition-all hover:shadow-md ${selectedCandidates.includes(candidate.id) ? 'border-[#0D9488] ring-1 ring-[#0D9488]/20' : 'border-[#E8ECF4]'}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={selectedCandidates.includes(candidate.id)} onChange={() => toggleSelect(candidate.id)} className="mt-1 accent-[#0D9488]" />
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-cyan-600 flex items-center justify-center text-white text-sm font-700 shrink-0">
                    {candidate.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-700 text-[#0D1B3E]">{candidate.name}</p>
                        <p className="text-xs text-[#6B7A99]">{candidate.role} · {candidate.experience}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-800 ${candidate.score >= 90 ? 'text-emerald-500' : candidate.score >= 80 ? 'text-blue-500' : 'text-amber-500'}`}>{candidate.score}%</span>
                        <button onClick={() => toggleSaved(candidate.id)} className="p-1 rounded-lg hover:bg-[#F4F6FA] transition-colors">
                          {candidate.saved ? <BookmarkCheck size={16} className="text-amber-500 fill-amber-500" /> : <Bookmark size={16} className="text-[#6B7A99]" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <StatusBadge status={candidate.status} />
                      <span className="text-[10px] text-[#6B7A99] flex items-center gap-1"><Building2 size={10} />{candidate.location}</span>
                      <span className="text-[10px] text-[#6B7A99] flex items-center gap-1"><Clock size={10} />{candidate.lastActive}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {candidate.skills.slice(0, 4).map(s => <SkillBadge key={s} skill={s} />)}
                    </div>
                    {candidate.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {candidate.tags.map(t => (
                          <span key={t} className="px-2 py-0.5 bg-violet-50 text-violet-700 text-[10px] font-600 rounded-full border border-violet-100">#{t}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F4F6FA]">
                      <button onClick={() => setTagModal(candidate.id)} className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors">
                        <Tag size={11} /> Tag
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50 transition-colors">
                        <Calendar size={11} /> Schedule
                      </button>
                      <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors">
                        <Mail size={11} /> Email
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Tab */}
      {activeTab === 'pipeline' && <PipelineTab />}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && <AnalyticsTab />}

      {/* Tag Modal */}
      {tagModal !== null && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setTagModal(null)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Add Tag to Candidate</h3>
              <button onClick={() => setTagModal(null)}><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            <div className="flex gap-2 mb-4">
              <input value={newTag} onChange={(e) => setNewTag(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTag(tagModal)} placeholder="e.g. react-expert, senior, shortlisted" className="flex-1 px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
              <button onClick={() => addTag(tagModal)} className="px-4 py-2 bg-[#0D9488] text-white text-sm font-600 rounded-lg hover:bg-[#0B8076]">Add</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => { setNewTag(t); }} className="px-2.5 py-1 bg-[#F4F6FA] text-[#6B7A99] text-xs font-600 rounded-full hover:bg-violet-50 hover:text-violet-700 transition-colors">#{t}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Schedule Modal */}
      {bulkScheduleModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setBulkScheduleModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Bulk Schedule Mock Interviews</h3>
              <button onClick={() => setBulkScheduleModal(false)}><X size={16} className="text-[#6B7A99]" /></button>
            </div>
            <p className="text-xs text-[#6B7A99] mb-4">Scheduling interviews for <span className="font-700 text-[#0D9488]">{selectedCandidates.length} candidates</span></p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Interview Date</label>
                <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Start Time</label>
                <input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]" />
              </div>
              <div>
                <label className="text-xs font-700 text-[#0D1B3E] mb-1 block">Interview Type</label>
                <select className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 bg-white text-[#6B7A99]">
                  <option>Mock Technical Interview</option>
                  <option>Mock HR Interview</option>
                  <option>Mock System Design</option>
                  <option>Full Mock Interview</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setBulkScheduleModal(false)} className="flex-1 py-2.5 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors">Cancel</button>
              <button onClick={() => { setBulkScheduleModal(false); clearSelection(); }} className="flex-1 py-2.5 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] transition-colors">Schedule {selectedCandidates.length} Interviews</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}