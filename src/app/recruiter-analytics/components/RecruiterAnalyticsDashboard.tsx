'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { BarChart2, TrendingUp, CheckCircle2, Users, Clock, Download, RefreshCw, ChevronDown, FileText,  } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Types ────────────────────────────────────────────────────────────────────
interface AnalyticsData {
  completionRateByRole: { role: string; total: number; completed: number; rate: number }[];
  avgScoreByRole: { role: string; avgScore: number; count: number }[];
  timeToHireTrend: { week: string; avgDays: number; interviews: number }[];
  scoreDistribution: { range: string; count: number; fill: string }[];
  kpis: {
    totalInterviews: number;
    completionRate: number;
    avgScore: number;
    avgTimeToHire: number;
    topPerformers: number;
    hireRate: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#F97316'];

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-600">{p.name}: {p.value}{p.name?.includes('Rate') || p.name?.includes('Score') ? '%' : ''}</p>
      ))}
    </div>
  );
}

function KPICard({ label, value, icon, bg, sub }: { label: string; value: string; icon: React.ReactNode; bg: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xl font-800 text-[#0D1B3E]">{value}</p>
      <p className="text-xs text-[#6B7A99] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#0D9488] font-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Fallback data ────────────────────────────────────────────────────────────
function getFallbackData(): AnalyticsData {
  return {
    completionRateByRole: [
      { role: 'Frontend Dev', total: 42, completed: 35, rate: 83 },
      { role: 'Backend Eng', total: 38, completed: 29, rate: 76 },
      { role: 'Full Stack', total: 31, completed: 25, rate: 81 },
      { role: 'DevOps', total: 18, completed: 12, rate: 67 },
      { role: 'ML Engineer', total: 22, completed: 19, rate: 86 },
      { role: 'Data Eng', total: 15, completed: 11, rate: 73 },
    ],
    avgScoreByRole: [
      { role: 'Frontend Dev', avgScore: 78, count: 35 },
      { role: 'Backend Eng', avgScore: 82, count: 29 },
      { role: 'Full Stack', avgScore: 75, count: 25 },
      { role: 'DevOps', avgScore: 71, count: 12 },
      { role: 'ML Engineer', avgScore: 88, count: 19 },
      { role: 'Data Eng', avgScore: 80, count: 11 },
    ],
    timeToHireTrend: [
      { week: 'W1', avgDays: 18, interviews: 22 },
      { week: 'W2', avgDays: 16, interviews: 28 },
      { week: 'W3', avgDays: 14, interviews: 31 },
      { week: 'W4', avgDays: 12, interviews: 27 },
      { week: 'W5', avgDays: 11, interviews: 24 },
      { week: 'W6', avgDays: 10, interviews: 30 },
    ],
    scoreDistribution: [
      { range: '0–40', count: 8, fill: '#EF4444' },
      { range: '41–60', count: 19, fill: '#F59E0B' },
      { range: '61–75', count: 42, fill: '#3B82F6' },
      { range: '76–90', count: 51, fill: '#0D9488' },
      { range: '91–100', count: 24, fill: '#8B5CF6' },
    ],
    kpis: { totalInterviews: 166, completionRate: 79, avgScore: 78, avgTimeToHire: 13, topPerformers: 75, hireRate: 42 },
  };
}

// ─── Export helpers ───────────────────────────────────────────────────────────
function exportCSV(data: any[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const escape = (v: any) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = [headers.join(','), ...data.map(row => headers.map(h => escape(row[h])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function RecruiterAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30d');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const daysBack = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : 365;
      const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

      const { data: interviews } = await supabase
        .from('interviews')
        .select('id, role, status, overall_score, scheduled_at, completed_at, recommendation, created_at')
        .gte('created_at', since)
        .order('created_at', { ascending: true });

      if (!interviews || interviews.length === 0) {
        setData(getFallbackData());
        setLoading(false);
        return;
      }

      // Completion rate by role
      const roleMap: Record<string, { total: number; completed: number; scores: number[]; days: number[] }> = {};
      interviews.forEach(iv => {
        if (!iv.role) return;
        if (!roleMap[iv.role]) roleMap[iv.role] = { total: 0, completed: 0, scores: [], days: [] };
        roleMap[iv.role].total++;
        if (iv.status === 'completed' || iv.status === 'evaluated') {
          roleMap[iv.role].completed++;
          if (iv.overall_score) roleMap[iv.role].scores.push(iv.overall_score);
          if (iv.scheduled_at && iv.completed_at) {
            const days = (new Date(iv.completed_at).getTime() - new Date(iv.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
            if (days >= 0 && days < 365) roleMap[iv.role].days.push(days);
          }
        }
      });

      const completionRateByRole = Object.entries(roleMap)
        .map(([role, d]) => ({ role: role.length > 14 ? role.slice(0, 14) + '…' : role, total: d.total, completed: d.completed, rate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0 }))
        .sort((a, b) => b.total - a.total).slice(0, 7);

      const avgScoreByRole = Object.entries(roleMap)
        .filter(([, d]) => d.scores.length > 0)
        .map(([role, d]) => ({ role: role.length > 14 ? role.slice(0, 14) + '…' : role, avgScore: Math.round(d.scores.reduce((a, b) => a + b, 0) / d.scores.length), count: d.scores.length }))
        .sort((a, b) => b.avgScore - a.avgScore).slice(0, 7);

      // Time-to-hire trend (weekly)
      const weekMap: Record<string, { days: number[]; count: number }> = {};
      interviews.forEach(iv => {
        if (!iv.scheduled_at || !iv.completed_at) return;
        const d = new Date(iv.created_at);
        const weeksAgo = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const key = `W${Math.max(1, Math.min(8, 8 - weeksAgo))}`;
        if (!weekMap[key]) weekMap[key] = { days: [], count: 0 };
        const days = (new Date(iv.completed_at).getTime() - new Date(iv.scheduled_at).getTime()) / (1000 * 60 * 60 * 24);
        if (days >= 0 && days < 365) weekMap[key].days.push(days);
        weekMap[key].count++;
      });
      const timeToHireTrend = Object.entries(weekMap)
        .map(([week, d]) => ({ week, avgDays: d.days.length > 0 ? Math.round(d.days.reduce((a, b) => a + b, 0) / d.days.length) : 0, interviews: d.count }))
        .sort((a, b) => a.week.localeCompare(b.week));

      // Score distribution
      const allScores = interviews.map(iv => iv.overall_score).filter(Boolean) as number[];
      const scoreDistribution = [
        { range: '0–40', count: allScores.filter(s => s <= 40).length, fill: '#EF4444' },
        { range: '41–60', count: allScores.filter(s => s > 40 && s <= 60).length, fill: '#F59E0B' },
        { range: '61–75', count: allScores.filter(s => s > 60 && s <= 75).length, fill: '#3B82F6' },
        { range: '76–90', count: allScores.filter(s => s > 75 && s <= 90).length, fill: '#0D9488' },
        { range: '91–100', count: allScores.filter(s => s > 90).length, fill: '#8B5CF6' },
      ];

      const completed = interviews.filter(iv => iv.status === 'completed' || iv.status === 'evaluated');
      const hired = interviews.filter(iv => iv.recommendation === 'strong_yes' || iv.recommendation === 'yes');
      const avgScore = allScores.length > 0 ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : 0;
      const allDays = Object.values(roleMap).flatMap(d => d.days);
      const avgTimeToHire = allDays.length > 0 ? Math.round(allDays.reduce((a, b) => a + b, 0) / allDays.length) : 0;

      setData({
        completionRateByRole,
        avgScoreByRole,
        timeToHireTrend: timeToHireTrend.length > 0 ? timeToHireTrend : getFallbackData().timeToHireTrend,
        scoreDistribution,
        kpis: {
          totalInterviews: interviews.length,
          completionRate: interviews.length > 0 ? Math.round((completed.length / interviews.length) * 100) : 0,
          avgScore,
          avgTimeToHire,
          topPerformers: allScores.filter(s => s >= 80).length,
          hireRate: interviews.length > 0 ? Math.round((hired.length / interviews.length) * 100) : 0,
        },
      });
    } catch {
      setData(getFallbackData());
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const d = data ?? getFallbackData();

  const handleExport = (chartName: string) => {
    setExportMenuOpen(false);
    if (chartName === 'completion') exportCSV(d.completionRateByRole, 'completion_rate_by_role');
    else if (chartName === 'scores') exportCSV(d.avgScoreByRole, 'avg_score_by_role');
    else if (chartName === 'tth') exportCSV(d.timeToHireTrend, 'time_to_hire_trend');
    else if (chartName === 'dist') exportCSV(d.scoreDistribution, 'score_distribution');
    else {
      // Export all KPIs
      exportCSV([d.kpis], 'recruiter_analytics_kpis');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Recruiter Analytics</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Interview completion rates, scores by role, time-to-hire trends & candidate scoring distribution</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* Date range selector */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="text-sm border border-[#E8ECF4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 text-[#6B7A99]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 12 months</option>
          </select>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors bg-white"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {/* Export dropdown */}
          <div className="relative" ref={exportRef}>
            <button
              onClick={() => setExportMenuOpen(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg transition-colors"
            >
              <Download size={14} />
              Export
              <ChevronDown size={12} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E8ECF4] rounded-xl shadow-xl z-20 w-52 py-1">
                {[
                  { key: 'completion', label: 'Completion Rates CSV' },
                  { key: 'scores', label: 'Avg Scores by Role CSV' },
                  { key: 'tth', label: 'Time-to-Hire Trend CSV' },
                  { key: 'dist', label: 'Score Distribution CSV' },
                  { key: 'kpis', label: 'KPI Summary CSV' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => handleExport(item.key)}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#0D1B3E] hover:bg-[#F4F6FA] transition-colors text-left"
                  >
                    <FileText size={13} className="text-[#0D9488]" />
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Interviews', value: loading ? '—' : d.kpis.totalInterviews.toLocaleString(), icon: <BarChart2 size={16} className="text-teal-600" />, bg: 'bg-teal-50' },
          { label: 'Completion Rate', value: loading ? '—' : `${d.kpis.completionRate}%`, icon: <CheckCircle2 size={16} className="text-emerald-600" />, bg: 'bg-emerald-50' },
          { label: 'Avg Score', value: loading ? '—' : `${d.kpis.avgScore}%`, icon: <TrendingUp size={16} className="text-violet-600" />, bg: 'bg-violet-50' },
          { label: 'Avg Time-to-Hire', value: loading ? '—' : `${d.kpis.avgTimeToHire}d`, icon: <Clock size={16} className="text-blue-600" />, bg: 'bg-blue-50' },
          { label: 'Top Performers', value: loading ? '—' : d.kpis.topPerformers.toLocaleString(), icon: <Users size={16} className="text-amber-600" />, bg: 'bg-amber-50', sub: 'Score ≥ 80%' },
          { label: 'Hire Rate', value: loading ? '—' : `${d.kpis.hireRate}%`, icon: <CheckCircle2 size={16} className="text-rose-600" />, bg: 'bg-rose-50' },
        ].map(kpi => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      {/* Row 1: Completion Rate by Role + Avg Score by Role */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Completion Rate by Role */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-800 text-[#0D1B3E]">Interview Completion Rate by Role</h3>
            <button onClick={() => handleExport('completion')} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors" title="Export CSV">
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-[#0D9488]" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.completionRateByRole} barSize={28} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <YAxis type="category" dataKey="role" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="rate" name="Completion Rate" radius={[0, 4, 4, 0]} fill="#0D9488">
                  {d.completionRateByRole.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {/* Table below chart */}
          <div className="mt-3 border-t border-[#F4F6FA] pt-3">
            <div className="grid grid-cols-4 text-[10px] font-700 text-[#6B7A99] uppercase tracking-wide mb-1 px-1">
              <span>Role</span><span className="text-right">Total</span><span className="text-right">Done</span><span className="text-right">Rate</span>
            </div>
            {d.completionRateByRole.slice(0, 4).map(r => (
              <div key={r.role} className="grid grid-cols-4 text-[11px] py-1 px-1 hover:bg-[#F4F6FA] rounded">
                <span className="text-[#0D1B3E] font-600 truncate">{r.role}</span>
                <span className="text-right text-[#6B7A99]">{r.total}</span>
                <span className="text-right text-[#6B7A99]">{r.completed}</span>
                <span className={`text-right font-700 ${r.rate >= 80 ? 'text-emerald-600' : r.rate >= 60 ? 'text-amber-600' : 'text-red-500'}`}>{r.rate}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avg Score by Role */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-800 text-[#0D1B3E]">Average Score by Role</h3>
            <button onClick={() => handleExport('scores')} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors" title="Export CSV">
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-[#0D9488]" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={d.avgScoreByRole} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                <XAxis dataKey="role" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>
                  {d.avgScoreByRole.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-3 border-t border-[#F4F6FA] pt-3 flex flex-wrap gap-2">
            {d.avgScoreByRole.map((r, i) => (
              <div key={r.role} className="flex items-center gap-1.5 text-[11px]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-[#6B7A99]">{r.role}</span>
                <span className="font-700 text-[#0D1B3E]">{r.avgScore}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Time-to-Hire Trend + Score Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Time-to-Hire Trend */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-800 text-[#0D1B3E]">Time-to-Hire Trend</h3>
              <p className="text-[11px] text-[#6B7A99] mt-0.5">Average days from schedule to completion</p>
            </div>
            <button onClick={() => handleExport('tth')} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors" title="Export CSV">
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-[#0D9488]" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.timeToHireTrend}>
                <defs>
                  <linearGradient id="tthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}d`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="avgDays" name="Avg Days" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: '#3B82F6' }} />
                <Line type="monotone" dataKey="interviews" name="Interviews" stroke="#0D9488" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 3, fill: '#0D9488' }} />
              </LineChart>
            </ResponsiveContainer>
          )}
          {/* Trend indicator */}
          {!loading && d.timeToHireTrend.length >= 2 && (() => {
            const first = d.timeToHireTrend[0].avgDays;
            const last = d.timeToHireTrend[d.timeToHireTrend.length - 1].avgDays;
            const delta = last - first;
            return (
              <div className={`mt-3 flex items-center gap-2 text-xs font-600 ${delta <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                <TrendingUp size={13} className={delta > 0 ? 'rotate-180' : ''} />
                {delta <= 0 ? `↓ ${Math.abs(delta)} days faster` : `↑ ${delta} days slower`} vs. start of period
              </div>
            );
          })()}
        </div>

        {/* Candidate Scoring Distribution */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-800 text-[#0D1B3E]">Candidate Scoring Distribution</h3>
              <p className="text-[11px] text-[#6B7A99] mt-0.5">Overall score buckets across all completed interviews</p>
            </div>
            <button onClick={() => handleExport('dist')} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors" title="Export CSV">
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-[#0D9488]" /></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={d.scoreDistribution}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={85}
                    dataKey="count"
                    nameKey="range"
                    paddingAngle={2}
                  >
                    {d.scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any, name: any) => [v, `Score ${name}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {d.scoreDistribution.map(bucket => {
                  const total = d.scoreDistribution.reduce((s, b) => s + b.count, 0);
                  const pct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
                  return (
                    <div key={bucket.range} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: bucket.fill }} />
                      <span className="text-xs text-[#6B7A99] w-14">{bucket.range}</span>
                      <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: bucket.fill }} />
                      </div>
                      <span className="text-xs font-700 text-[#0D1B3E] w-8 text-right">{bucket.count}</span>
                      <span className="text-[10px] text-[#6B7A99] w-8 text-right">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Combined area chart */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-800 text-[#0D1B3E]">Interview Volume & Score Trend</h3>
            <p className="text-[11px] text-[#6B7A99] mt-0.5">Weekly interview count vs. average score over time</p>
          </div>
          <button onClick={() => handleExport('tth')} className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99] transition-colors" title="Export CSV">
            <Download size={13} />
          </button>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-[#0D9488]" /></div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={d.timeToHireTrend}>
              <defs>
                <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0D9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="daysGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="interviews" name="Interviews" stroke="#0D9488" fill="url(#volGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="avgDays" name="Avg Days" stroke="#8B5CF6" fill="url(#daysGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
