'use client';
import React, { useState, useEffect } from 'react';
import RecruiterKPIGrid from './RecruiterKPIGrid';
import RecruiterChartsRow from './RecruiterChartsRow';
import RecentInterviewsTable from './RecentInterviewsTable';
import RecruiterActivityFeed from './RecruiterActivityFeed';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Users, BarChart2, TrendingUp, Download, Plus, Search, Tag, Calendar, X, Bookmark, BookmarkCheck, Target, Clock, Mail, Building2, CheckCircle2, RefreshCw, Upload, ClipboardCheck } from 'lucide-react';
import WalkthroughTrigger from '@/components/WalkthroughTrigger';
import ActivityHeatmap from '@/components/ActivityHeatmap';
import { createClient } from '@/lib/supabase/client';
import { recruiterCandidateMetaService } from '@/lib/services/interviewService';
import { trackEvent } from '@/lib/analytics';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import Link from 'next/link';
import { toast } from 'sonner';
import { csrfHeaders } from '@/lib/api/apiClient';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'candidate-search', label: 'Candidate Search' },
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'analytics', label: 'Analytics' },
];

interface Candidate {
  id: string;
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

const PIPELINE_COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];
const ALL_TAGS = ['top-performer', 'shortlisted', 'follow-up', 'strong-hire', 'needs-review'];

function relativeTime(iso?: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(0, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

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
            { stage: 'Scheduled', count: 0, color: '#3B82F6' },
            { stage: 'In Progress', count: 0, color: '#F59E0B' },
            { stage: 'Completed', count: 0, color: '#0D9488' },
            { stage: 'Evaluated', count: 0, color: '#8B5CF6' },
            { stage: 'Archived', count: 0, color: '#6B7A99' },
          ]);
          setStageBreakdown([]);
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
          {stageBreakdown.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-xs text-[#6B7A99]">No role data yet</div>
          ) : (
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
          )}
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
          setTrendData(trend);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setKpis({ totalInterviews: 0, avgScore: 0, completionRate: 0, topPerformers: 0 });
          setScoreData([
            { range: '0-40', count: 0, fill: '#EF4444' },
            { range: '41-60', count: 0, fill: '#F59E0B' },
            { range: '61-75', count: 0, fill: '#3B82F6' },
            { range: '76-90', count: 0, fill: '#0D9488' },
            { range: '91-100', count: 0, fill: '#8B5CF6' },
          ]);
          setTrendData([]);
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

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RecruiterDashboardContent() {
  const [activeTab, setActiveTab] = useState('overview');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [heatmapData, setHeatmapData] = useState<{ date: string; value: number; label?: string }[]>([]);
  const [skillSearch, setSkillSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [tagModal, setTagModal] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [bulkScheduleModal, setBulkScheduleModal] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');
  const [scheduleRole, setScheduleRole] = useState('');
  const [bulkScheduling, setBulkScheduling] = useState(false);
  const [bulkEmailModal, setBulkEmailModal] = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [bulkEmailing, setBulkEmailing] = useState(false);
  const [newJobModal, setNewJobModal] = useState(false);
  const [jobTitle, setJobTitle] = useState('');
  const [jobDepartment, setJobDepartment] = useState('');
  const [jobLocation, setJobLocation] = useState('');
  const [jobEmploymentType, setJobEmploymentType] = useState('full_time');
  const [creatingJob, setCreatingJob] = useState(false);
  const { user } = useAuth();

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

  useEffect(() => {
    let cancelled = false;
    async function loadCandidates() {
      setCandidatesLoading(true);
      try {
        const supabase = createClient();

        const [{ data: candRows }, { data: ivRows }, metaRows] = await Promise.all([
          supabase.from('candidates').select('id, name, email, role, department, experience_level, created_at').order('created_at', { ascending: false }).limit(200),
          supabase.from('interviews').select('id, candidate_id, status, overall_score, recommendation, updated_at, created_at, scheduled_at').limit(500),
          recruiterCandidateMetaService.listForCurrentUser(),
        ]);

        const savedIds = new Set<string>();
        const tagsMap: Record<string, string[]> = {};
        metaRows.forEach((m) => {
          if (m.saved) savedIds.add(m.candidate_id);
          if (m.tags?.length) tagsMap[m.candidate_id] = m.tags;
        });

        const byCandidate: Record<string, {
          scores: number[];
          statuses: string[];
          recommendations: string[];
          latest: string | null;
        }> = {};

        (ivRows || []).forEach((iv: any) => {
          if (!iv.candidate_id) return;
          if (!byCandidate[iv.candidate_id]) {
            byCandidate[iv.candidate_id] = { scores: [], statuses: [], recommendations: [], latest: null };
          }
          const bucket = byCandidate[iv.candidate_id];
          bucket.statuses.push(iv.status);
          if (typeof iv.overall_score === 'number') bucket.scores.push(iv.overall_score);
          if (iv.recommendation) bucket.recommendations.push(iv.recommendation);
          const ts = iv.updated_at || iv.completed_at || iv.scheduled_at || iv.created_at;
          if (ts && (!bucket.latest || new Date(ts) > new Date(bucket.latest))) bucket.latest = ts;
        });

        // Heatmap from interview dates
        const heatMap: Record<string, number> = {};
        (ivRows || []).forEach((iv: any) => {
          const raw = iv.scheduled_at || iv.created_at;
          if (!raw) return;
          const key = new Date(raw).toISOString().slice(0, 10);
          heatMap[key] = (heatMap[key] || 0) + 1;
        });
        const cells: { date: string; value: number; label?: string }[] = [];
        const now = new Date();
        for (let w = 11; w >= 0; w--) {
          for (let d = 0; d < 7; d++) {
            const date = new Date(now);
            date.setDate(date.getDate() - w * 7 - (6 - d));
            const key = date.toISOString().slice(0, 10);
            const value = Math.min(4, heatMap[key] || 0);
            cells.push({
              date: key,
              value,
              label: `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${value} interview${value !== 1 ? 's' : ''}`,
            });
          }
        }

        const mapped: Candidate[] = (candRows || []).map((c: any) => {
          const agg = byCandidate[c.id];
          const score = agg?.scores.length
            ? Math.round(agg.scores.reduce((a, b) => a + b, 0) / agg.scores.length)
            : 0;
          let status: Candidate['status'] = 'available';
          if (agg?.statuses.some((s) => s === 'in_progress' || s === 'scheduled')) status = 'interviewing';
          else if (agg?.recommendations.some((r) => r === 'strong_yes' || r === 'yes')) status = 'placed';

          const skills = [c.role, c.department, c.experience_level].filter(Boolean) as string[];

          return {
            id: c.id,
            name: c.name || 'Candidate',
            email: c.email || '',
            role: c.role || 'General',
            skills: Array.from(new Set(skills)),
            score,
            experience: c.experience_level || '—',
            location: c.department || '—',
            status,
            saved: savedIds.has(c.id),
            tags: tagsMap[c.id] || [],
            lastActive: relativeTime(agg?.latest || c.created_at),
            interviewsCompleted: agg?.statuses.filter((s) => s === 'completed' || s === 'evaluated').length || 0,
          };
        });

        if (!cancelled) {
          setCandidates(mapped);
          setHeatmapData(cells);
        }
      } catch (err) {
        console.error('Recruiter candidate load error:', err);
        if (!cancelled) {
          setCandidates([]);
          setHeatmapData([]);
        }
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    }
    loadCandidates();
    return () => { cancelled = true; };
  }, [user?.id]);

  const ALL_ROLES = Array.from(new Set(candidates.map((c) => c.role).filter(Boolean))).sort();
  const ALL_SKILLS = Array.from(new Set(candidates.flatMap((c) => c.skills))).sort();

  const toggleSkill = (skill: string) => setSelectedSkills(prev => prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]);
  const toggleSaved = (id: string) => {
    const current = candidates.find((c) => c.id === id);
    if (!current) return;
    const nextSaved = !current.saved;
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, saved: nextSaved } : c)));
    void recruiterCandidateMetaService.upsert(id, { saved: nextSaved }).then((row) => {
      if (!row) {
        setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, saved: current.saved } : c)));
        toast.error('Could not save bookmark');
      }
    });
  };
  const toggleSelect = (id: string) => setSelectedCandidates(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const clearSelection = () => setSelectedCandidates([]);

  const filteredCandidates = candidates.filter(c => {
    const matchSearch = !skillSearch || c.name.toLowerCase().includes(skillSearch.toLowerCase()) || c.skills.some(s => s.toLowerCase().includes(skillSearch.toLowerCase())) || c.email.toLowerCase().includes(skillSearch.toLowerCase());
    const matchRole = !roleFilter || c.role === roleFilter;
    const matchScore = c.score >= minScore;
    const matchSkills = selectedSkills.length === 0 || selectedSkills.every(s => c.skills.includes(s));
    return matchSearch && matchRole && matchScore && matchSkills;
  });

  const addTag = (candidateId: string) => {
    if (!newTag.trim()) return;
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, '-');
    const current = candidates.find((c) => c.id === candidateId);
    const nextTags = [...new Set([...(current?.tags || []), tag])];
    setCandidates((prev) =>
      prev.map((c) => (c.id === candidateId ? { ...c, tags: nextTags } : c)),
    );
    setNewTag('');
    setTagModal(null);
    void recruiterCandidateMetaService.upsert(candidateId, { tags: nextTags }).then((row) => {
      if (!row) {
        setCandidates((prev) =>
          prev.map((c) => (c.id === candidateId ? { ...c, tags: current?.tags || [] } : c)),
        );
        toast.error('Could not save tag');
      }
    });
  };

  const selectAll = () => setSelectedCandidates(filteredCandidates.map(c => c.id));

  const handleBulkSchedule = async () => {
    if (!selectedCandidates.length) {
      toast.error('Select at least one candidate');
      return;
    }
    if (!scheduleDate || !scheduleTime) {
      toast.error('Pick a date and time');
      return;
    }
    const scheduled_at = new Date(`${scheduleDate}T${scheduleTime}:00`);
    if (Number.isNaN(scheduled_at.getTime())) {
      toast.error('Invalid date/time');
      return;
    }
    if (scheduled_at.getTime() < Date.now()) {
      toast.error('Schedule time must be in the future');
      return;
    }

    const roleGuess =
      scheduleRole.trim() ||
      candidates.find((c) => selectedCandidates.includes(c.id))?.role ||
      'Interview';

    setBulkScheduling(true);
    try {
      const res = await fetch('/api/interviews/bulk-schedule', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          candidate_ids: selectedCandidates,
          scheduled_at: scheduled_at.toISOString(),
          role: roleGuess,
          company: 'Triveda',
          interview_type: 'mixed',
          duration_minutes: 45,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Bulk schedule failed');
      }
      const created = json?.data?.created ?? 0;
      const notified = json?.data?.notified ?? 0;
      toast.success(`Scheduled ${created} interview${created === 1 ? '' : 's'}${notified ? ` · ${notified} notified` : ''}`);
      setBulkScheduleModal(false);
      setSelectedCandidates([]);
      setScheduleDate('');
      setScheduleTime('10:00');
      setScheduleRole('');
    } catch (err: any) {
      console.error('bulk schedule error:', err);
      toast.error(err?.message || 'Could not schedule interviews');
    } finally {
      setBulkScheduling(false);
    }
  };

  const handleBulkEmail = async () => {
    if (!selectedCandidates.length) {
      toast.error('Select at least one candidate');
      return;
    }
    if (!emailSubject.trim() || !emailBody.trim()) {
      toast.error('Subject and message are required');
      return;
    }

    const withEmail = selectedCandidates.filter((id) => {
      const c = candidates.find((x) => x.id === id);
      return Boolean(c?.email?.includes('@'));
    });
    if (!withEmail.length) {
      toast.error('None of the selected candidates have an email address');
      return;
    }

    setBulkEmailing(true);
    try {
      const res = await fetch('/api/email/bulk', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          candidate_ids: selectedCandidates,
          subject: emailSubject.trim(),
          body: emailBody.trim(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Bulk email failed');
      }
      const sent = json?.data?.sent ?? 0;
      const failed = json?.data?.failed ?? 0;
      const notified = json?.data?.notified ?? 0;
      if (failed > 0 && sent > 0) {
        toast.warning(`Sent ${sent}, failed ${failed}${notified ? ` · ${notified} notified` : ''}`);
      } else {
        toast.success(`Sent ${sent} email${sent === 1 ? '' : 's'}${notified ? ` · ${notified} notified` : ''}`);
      }
      setBulkEmailModal(false);
      setSelectedCandidates([]);
      setEmailSubject('');
      setEmailBody('');
    } catch (err: unknown) {
      console.error('bulk email error:', err);
      toast.error(err instanceof Error ? err.message : 'Could not send emails');
    } finally {
      setBulkEmailing(false);
    }
  };

  const handleCreateJob = async () => {
    if (!jobTitle.trim()) {
      toast.error('Job title is required');
      return;
    }
    setCreatingJob(true);
    try {
      const res = await fetch('/api/job-postings', {
        method: 'POST',
        headers: csrfHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: jobTitle.trim(),
          department: jobDepartment.trim() || undefined,
          location: jobLocation.trim() || undefined,
          employment_type: jobEmploymentType,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to create job');
      toast.success(`Created “${jobTitle.trim()}”`);
      setNewJobModal(false);
      setJobTitle('');
      setJobDepartment('');
      setJobLocation('');
      setJobEmploymentType('full_time');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not create job');
    } finally {
      setCreatingJob(false);
    }
  };

  const scoredCandidates = candidates.filter((c) => c.score > 0);
  const avgScoreDisplay = scoredCandidates.length
    ? Math.round(scoredCandidates.reduce((s, c) => s + c.score, 0) / scoredCandidates.length)
    : 0;

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
              <p className="text-base font-800 text-[#0D1B3E]">{avgScoreDisplay || '—'}{avgScoreDisplay ? '%' : ''}</p>
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
          <Link
            href="/bulk-export"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors bg-white"
          >
            <Download size={14} /> Export
          </Link>
          <button
            type="button"
            onClick={() => setNewJobModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors"
          >
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
            subtitle="Scheduled interviews by day across the past 12 weeks"
            colorScheme="blue"
            mode="weekly"
            data={heatmapData}
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
              <button
                type="button"
                onClick={() => setBulkScheduleModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-[#0D9488] text-white rounded-lg hover:bg-[#0B8076] transition-colors"
              >
                <Calendar size={14} /> Bulk Schedule Interview
              </button>
              <button
                type="button"
                onClick={() => setBulkEmailModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-600 bg-white border border-[#E8ECF4] text-[#0D1B3E] rounded-lg hover:bg-[#F4F6FA] transition-colors"
              >
                <Mail size={14} /> Bulk Email
              </button>
              <button onClick={clearSelection} className="p-1.5 rounded-lg hover:bg-white/50 text-[#6B7A99] transition-colors"><X size={14} /></button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-[#6B7A99]">
              <span className="font-700 text-[#0D1B3E]">{filteredCandidates.length}</span> candidates found
              {candidatesLoading && <span className="ml-2 text-[11px]">Loading…</span>}
            </p>
            <div className="flex items-center gap-2">
              <button onClick={selectAll} className="text-xs font-600 text-[#0D9488] hover:underline">Select All</button>
              {selectedCandidates.length > 0 && <button onClick={clearSelection} className="text-xs font-600 text-[#6B7A99] hover:underline">Clear</button>}
            </div>
          </div>

          {!candidatesLoading && filteredCandidates.length === 0 ? (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-12 text-center">
              <Users size={28} className="mx-auto text-[#6B7A99]/40 mb-3" />
              <p className="text-sm font-700 text-[#0D1B3E]">No candidates match</p>
              <p className="text-xs text-[#6B7A99] mt-1">
                {candidates.length === 0
                  ? 'Candidates appear here once they register or are imported.'
                  : 'Try clearing filters or searching a different skill.'}
              </p>
            </div>
          ) : (
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
                        <Link
                          href={`/candidate-360?id=${candidate.id}`}
                          className="font-700 text-[#0D1B3E] hover:text-[#0D9488] hover:underline"
                        >
                          {candidate.name}
                        </Link>
                        <p className="text-xs text-[#6B7A99]">{candidate.role} · {candidate.experience}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-800 ${candidate.score >= 90 ? 'text-emerald-500' : candidate.score >= 80 ? 'text-blue-500' : candidate.score > 0 ? 'text-amber-500' : 'text-[#6B7A99]'}`}>
                          {candidate.score > 0 ? `${candidate.score}%` : '—'}
                        </span>
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
                      <Link
                        href={`/candidate-360?id=${candidate.id}`}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#0D1B3E] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors"
                      >
                        View 360
                      </Link>
                      <button
                        type="button"
                        onClick={() => setTagModal(candidate.id)}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors"
                      >
                        <Tag size={11} /> Tag
                      </button>
                      <Link
                        href="/invitations"
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#0D9488] border border-[#0D9488]/30 rounded-lg hover:bg-teal-50 transition-colors"
                      >
                        <Calendar size={11} /> Invite
                      </Link>
                      <a
                        href={`mailto:${candidate.email}`}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors"
                      >
                        <Mail size={11} /> Email
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          )}
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !bulkScheduling && setBulkScheduleModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Bulk Schedule Interviews</h3>
              <button type="button" disabled={bulkScheduling} onClick={() => setBulkScheduleModal(false)}>
                <X size={16} className="text-[#6B7A99]" />
              </button>
            </div>
            <p className="text-sm text-[#6B7A99] leading-relaxed mb-4">
              Schedule interviews for{' '}
              <span className="font-700 text-[#0D9488]">{selectedCandidates.length}</span> selected candidate
              {selectedCandidates.length === 1 ? '' : 's'}. Linked accounts get an in-app notification.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Role / title</label>
                <input
                  type="text"
                  value={scheduleRole}
                  onChange={(e) => setScheduleRole(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Date</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Time</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={bulkScheduling}
                onClick={() => setBulkScheduleModal(false)}
                className="flex-1 py-2.5 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkScheduling || !selectedCandidates.length}
                onClick={handleBulkSchedule}
                className="flex-1 py-2.5 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] transition-colors disabled:opacity-40"
              >
                {bulkScheduling ? 'Scheduling…' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Email Modal */}
      {bulkEmailModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !bulkEmailing && setBulkEmailModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Bulk Email Candidates</h3>
              <button type="button" disabled={bulkEmailing} onClick={() => setBulkEmailModal(false)}>
                <X size={16} className="text-[#6B7A99]" />
              </button>
            </div>
            <p className="text-sm text-[#6B7A99] leading-relaxed mb-4">
              Send to{' '}
              <span className="font-700 text-[#0D9488]">{selectedCandidates.length}</span> selected candidate
              {selectedCandidates.length === 1 ? '' : 's'}. Use{' '}
              <code className="text-[11px] bg-[#F4F6FA] px-1 rounded">{'{{name}}'}</code> or{' '}
              <code className="text-[11px] bg-[#F4F6FA] px-1 rounded">{'{{email}}'}</code> for personalization.
            </p>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Interview next steps for {{name}}"
                  maxLength={300}
                  className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={'Hi {{name}},\n\nThanks for interviewing with us…'}
                  rows={7}
                  maxLength={10000}
                  className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] resize-y min-h-[140px]"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={bulkEmailing}
                onClick={() => setBulkEmailModal(false)}
                className="flex-1 py-2.5 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={bulkEmailing || !selectedCandidates.length || !emailSubject.trim() || !emailBody.trim()}
                onClick={handleBulkEmail}
                className="flex-1 py-2.5 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] transition-colors disabled:opacity-40"
              >
                {bulkEmailing ? 'Sending…' : 'Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Job Modal */}
      {newJobModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !creatingJob && setNewJobModal(false)}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-700 text-[#0D1B3E]">Create Job Posting</h3>
              <button type="button" disabled={creatingJob} onClick={() => setNewJobModal(false)}>
                <X size={16} className="text-[#6B7A99]" />
              </button>
            </div>
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Engineer"
                  maxLength={200}
                  className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>
              <div>
                <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Department</label>
                <input
                  type="text"
                  value={jobDepartment}
                  onChange={(e) => setJobDepartment(e.target.value)}
                  placeholder="Engineering"
                  className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Location</label>
                  <input
                    type="text"
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="Remote"
                    className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  />
                </div>
                <div>
                  <label className="text-xs font-700 text-[#6B7A99] mb-1.5 block">Type</label>
                  <select
                    value={jobEmploymentType}
                    onChange={(e) => setJobEmploymentType(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#E8ECF4] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488]"
                  >
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={creatingJob}
                onClick={() => setNewJobModal(false)}
                className="flex-1 py-2.5 text-sm font-600 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={creatingJob || !jobTitle.trim()}
                onClick={handleCreateJob}
                className="flex-1 py-2.5 text-sm font-600 bg-[#0D9488] text-white rounded-xl hover:bg-[#0B8076] transition-colors disabled:opacity-40"
              >
                {creatingJob ? 'Creating…' : 'Create Job'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}