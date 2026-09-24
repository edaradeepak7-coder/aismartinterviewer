'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line,
} from 'recharts';
import {
  BarChart2, TrendingUp, CheckCircle2, Users, Clock, Download, RefreshCw,
  ChevronDown, FileText, AlertCircle,
} from 'lucide-react';

interface AnalyticsData {
  completionRateByRole: { role: string; total: number; completed: number; rate: number }[];
  avgScoreByRole: { role: string; avgScore: number; count: number }[];
  timeToHireTrend: { week: string; avgDays: number; hires: number }[];
  scoreDistribution: { range: string; count: number; fill: string }[];
  kpis: {
    totalInterviews: number;
    completionRate: number;
    avgScore: number;
    avgTimeToHire: number;
    topPerformers: number;
    hireRate: number;
    offersSent: number;
    offersAccepted: number;
  };
  empty: boolean;
}

const COLORS = ['#0D9488', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#10B981', '#F97316'];

function emptyData(): AnalyticsData {
  return {
    completionRateByRole: [],
    avgScoreByRole: [],
    timeToHireTrend: [],
    scoreDistribution: [
      { range: '0–40', count: 0, fill: '#EF4444' },
      { range: '41–60', count: 0, fill: '#F59E0B' },
      { range: '61–75', count: 0, fill: '#3B82F6' },
      { range: '76–90', count: 0, fill: '#0D9488' },
      { range: '91–100', count: 0, fill: '#8B5CF6' },
    ],
    kpis: {
      totalInterviews: 0,
      completionRate: 0,
      avgScore: 0,
      avgTimeToHire: 0,
      topPerformers: 0,
      hireRate: 0,
      offersSent: 0,
      offersAccepted: 0,
    },
    empty: true,
  };
}

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ color?: string; name?: string; value?: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-600">
          {p.name}: {p.value}
          {p.name?.includes('Rate') || p.name?.includes('Score') ? '%' : ''}
        </p>
      ))}
    </div>
  );
}

function KPICard({
  label, value, icon, bg, sub,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>{icon}</div>
      <p className="text-xl font-800 text-[#0D1B3E]">{value}</p>
      <p className="text-xs text-[#6B7A99] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[#0D9488] font-600 mt-1">{sub}</p>}
    </div>
  );
}

function exportCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v).replace(/"/g, '""');
    return /[",\n\r]/.test(s) ? `"${s}"` : s;
  };
  const csv = [
    headers.join(','),
    ...data.map((row) => headers.map((h) => escape(row[h])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function RecruiterAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData>(emptyData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/recruiter-analytics?range=${dateRange}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Failed to load analytics');
        setData(emptyData());
      } else {
        setData({
          ...emptyData(),
          ...json.data,
          empty: Boolean(json.data?.empty),
        });
      }
    } catch {
      setError('Failed to load analytics');
      setData(emptyData());
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const d = data;

  const handleExport = (chartName: string) => {
    setExportMenuOpen(false);
    if (chartName === 'completion') exportCSV(d.completionRateByRole as unknown as Record<string, unknown>[], 'completion_rate_by_role');
    else if (chartName === 'scores') exportCSV(d.avgScoreByRole as unknown as Record<string, unknown>[], 'avg_score_by_role');
    else if (chartName === 'tth') exportCSV(d.timeToHireTrend as unknown as Record<string, unknown>[], 'time_to_hire_trend');
    else if (chartName === 'dist') exportCSV(d.scoreDistribution as unknown as Record<string, unknown>[], 'score_distribution');
    else exportCSV([d.kpis as unknown as Record<string, unknown>], 'recruiter_analytics_kpis');
  };

  const chartsEmpty =
    !loading &&
    d.completionRateByRole.length === 0 &&
    d.avgScoreByRole.length === 0 &&
    d.timeToHireTrend.length === 0;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Recruiter Analytics</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              Your interviews, scores, offer acceptance, and time-to-hire from accepted offers.{' '}
              <a href="/bulk-export" className="text-[#0D9488] font-600 hover:underline">
                Full CSV/PDF export →
              </a>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm border border-[#E8ECF4] rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 text-[#6B7A99]"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last 12 months</option>
          </select>
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-lg hover:bg-[#F4F6FA] transition-colors bg-white"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
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
                ].map((item) => (
                  <button
                    type="button"
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

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-600 text-red-700">{error}</p>
            <button type="button" onClick={fetchData} className="text-xs text-red-600 underline mt-1">
              Retry
            </button>
          </div>
        </div>
      )}

      {!loading && !error && d.empty && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-8 text-center">
          <BarChart2 size={28} className="mx-auto text-[#6B7A99]/40 mb-2" />
          <p className="text-sm font-700 text-[#0D1B3E]">No data in this period</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            KPIs stay at zero until you have interviews or offers in the selected range.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: 'Total Interviews',
            value: loading ? '—' : d.kpis.totalInterviews.toLocaleString(),
            icon: <BarChart2 size={16} className="text-teal-600" />,
            bg: 'bg-teal-50',
          },
          {
            label: 'Completion Rate',
            value: loading ? '—' : `${d.kpis.completionRate}%`,
            icon: <CheckCircle2 size={16} className="text-emerald-600" />,
            bg: 'bg-emerald-50',
          },
          {
            label: 'Avg Score',
            value: loading ? '—' : `${d.kpis.avgScore}`,
            icon: <TrendingUp size={16} className="text-violet-600" />,
            bg: 'bg-violet-50',
          },
          {
            label: 'Avg Time-to-Hire',
            value: loading ? '—' : `${d.kpis.avgTimeToHire}d`,
            icon: <Clock size={16} className="text-blue-600" />,
            bg: 'bg-blue-50',
            sub: 'Interview → offer accept',
          },
          {
            label: 'Top Performers',
            value: loading ? '—' : d.kpis.topPerformers.toLocaleString(),
            icon: <Users size={16} className="text-amber-600" />,
            bg: 'bg-amber-50',
            sub: 'Score ≥ 80',
          },
          {
            label: 'Offer Accept Rate',
            value: loading ? '—' : `${d.kpis.hireRate}%`,
            icon: <CheckCircle2 size={16} className="text-rose-600" />,
            bg: 'bg-rose-50',
            sub: loading
              ? undefined
              : `${d.kpis.offersAccepted}/${d.kpis.offersSent} offers`,
          },
        ].map((kpi) => (
          <KPICard key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-800 text-[#0D1B3E]">Interview Completion Rate by Role</h3>
            <button
              type="button"
              onClick={() => handleExport('completion')}
              className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99]"
              title="Export CSV"
            >
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
            </div>
          ) : d.completionRateByRole.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#6B7A99]">No role data</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.completionRateByRole} barSize={28} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="role"
                    tick={{ fontSize: 10, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="rate" name="Completion Rate" radius={[0, 4, 4, 0]} fill="#0D9488">
                    {d.completionRateByRole.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 border-t border-[#F4F6FA] pt-3">
                <div className="grid grid-cols-4 text-[10px] font-700 text-[#6B7A99] uppercase tracking-wide mb-1 px-1">
                  <span>Role</span>
                  <span className="text-right">Total</span>
                  <span className="text-right">Done</span>
                  <span className="text-right">Rate</span>
                </div>
                {d.completionRateByRole.slice(0, 4).map((r) => (
                  <div key={r.role} className="grid grid-cols-4 text-[11px] py-1 px-1 hover:bg-[#F4F6FA] rounded">
                    <span className="text-[#0D1B3E] font-600 truncate">{r.role}</span>
                    <span className="text-right text-[#6B7A99]">{r.total}</span>
                    <span className="text-right text-[#6B7A99]">{r.completed}</span>
                    <span
                      className={`text-right font-700 ${
                        r.rate >= 80 ? 'text-emerald-600' : r.rate >= 60 ? 'text-amber-600' : 'text-red-500'
                      }`}
                    >
                      {r.rate}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-800 text-[#0D1B3E]">Average Score by Role</h3>
            <button
              type="button"
              onClick={() => handleExport('scores')}
              className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99]"
              title="Export CSV"
            >
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
            </div>
          ) : d.avgScoreByRole.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#6B7A99]">No scored interviews</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={d.avgScoreByRole} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                  <XAxis dataKey="role" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#6B7A99' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="avgScore" name="Avg Score" radius={[4, 4, 0, 0]}>
                    {d.avgScoreByRole.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-3 border-t border-[#F4F6FA] pt-3 flex flex-wrap gap-2">
                {d.avgScoreByRole.map((r, i) => (
                  <div key={r.role} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-[#6B7A99]">{r.role}</span>
                    <span className="font-700 text-[#0D1B3E]">{r.avgScore}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-800 text-[#0D1B3E]">Time-to-Hire Trend</h3>
              <p className="text-[11px] text-[#6B7A99] mt-0.5">
                Days from interview create → offer accepted
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('tth')}
              className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99]"
              title="Export CSV"
            >
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
            </div>
          ) : d.timeToHireTrend.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#6B7A99]">
              No accepted offers linked to interviews yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={d.timeToHireTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#6B7A99' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}d`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="avgDays"
                  name="Avg Days"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#3B82F6' }}
                />
                <Line
                  type="monotone"
                  dataKey="hires"
                  name="Hires"
                  stroke="#0D9488"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={{ r: 3, fill: '#0D9488' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-800 text-[#0D1B3E]">Candidate Scoring Distribution</h3>
              <p className="text-[11px] text-[#6B7A99] mt-0.5">Overall scores on your interviews</p>
            </div>
            <button
              type="button"
              onClick={() => handleExport('dist')}
              className="p-1.5 rounded-lg hover:bg-[#F4F6FA] text-[#6B7A99]"
              title="Export CSV"
            >
              <Download size={13} />
            </button>
          </div>
          {loading ? (
            <div className="h-56 flex items-center justify-center">
              <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
            </div>
          ) : d.scoreDistribution.every((b) => b.count === 0) ? (
            <div className="h-56 flex items-center justify-center text-sm text-[#6B7A99]">No scores yet</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={d.scoreDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    dataKey="count"
                    nameKey="range"
                    paddingAngle={2}
                  >
                    {d.scoreDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number, name: string) => [v, `Score ${name}`]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {d.scoreDistribution.map((bucket) => {
                  const total = d.scoreDistribution.reduce((s, b) => s + b.count, 0);
                  const pct = total > 0 ? Math.round((bucket.count / total) * 100) : 0;
                  return (
                    <div key={bucket.range} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: bucket.fill }} />
                      <span className="text-xs text-[#6B7A99] w-14">{bucket.range}</span>
                      <div className="flex-1 h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: bucket.fill }}
                        />
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

      <div className="bg-white border border-[#E8ECF4] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-800 text-[#0D1B3E]">Hire volume & time-to-hire</h3>
            <p className="text-[11px] text-[#6B7A99] mt-0.5">Weekly accepted offers vs average days to accept</p>
          </div>
        </div>
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <RefreshCw size={20} className="animate-spin text-[#0D9488]" />
          </div>
        ) : chartsEmpty || d.timeToHireTrend.length === 0 ? (
          <div className="h-40 flex items-center justify-center text-sm text-[#6B7A99]">
            Chart appears once offers are accepted
          </div>
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
              <Area type="monotone" dataKey="hires" name="Hires" stroke="#0D9488" fill="url(#volGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="avgDays" name="Avg Days" stroke="#8B5CF6" fill="url(#daysGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
