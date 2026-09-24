'use client';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, GraduationCap, Briefcase, Layers, TrendingUp, Award, Search,
  BarChart2, Target, ArrowUpRight, ArrowDownRight, Loader2, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend,
} from 'recharts';

type SegmentBy = 'institution' | 'role' | 'skill' | 'tier';

interface CohortRow {
  name: string;
  candidates: number;
  placed: number;
  avgScore: number;
  placementRate: number;
  trend: number;
  topSkill?: string;
  demand?: string;
  avgTimeToHire?: string;
  topCompany?: string;
}

interface SegPayload {
  institution: CohortRow[];
  role: CohortRow[];
  skill: CohortRow[];
  tier: CohortRow[];
  outcomeTimeline: { month: string; enrolled: number; assessed: number; interviewed: number; placed: number }[];
  radarData: { metric: string; [k: string]: string | number }[];
  radarLabels: string[];
  kpis: {
    totalCandidates: number;
    totalPlaced: number;
    avgPlacementRate: number;
    avgScore: number;
  };
  empty: boolean;
  skillTabLabel: string;
}

const RADAR_COLORS = ['#7C3AED', '#0D9488', '#F59E0B', '#EF4444'];

export default function CandidateSegmentationContent() {
  const [activeSegment, setActiveSegment] = useState<SegmentBy>('role');
  const [search, setSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<SegPayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/candidate-segmentation');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      setData(json.data as SegPayload);
      const d = json.data as SegPayload;
      if (d?.institution?.length) setActiveSegment((prev) => (prev === 'role' && !d.role.length ? 'institution' : prev));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const skillLabel = data?.skillTabLabel || 'By Experience';

  const SEGMENT_TABS: { id: SegmentBy; label: string; icon: React.ReactNode }[] = [
    { id: 'institution', label: 'By Institution', icon: <GraduationCap size={15} /> },
    { id: 'role', label: 'By Role', icon: <Briefcase size={15} /> },
    { id: 'skill', label: skillLabel, icon: <Layers size={15} /> },
    { id: 'tier', label: 'By Performance Tier', icon: <Award size={15} /> },
  ];

  const currentData: CohortRow[] =
    activeSegment === 'institution'
      ? data?.institution || []
      : activeSegment === 'role'
        ? data?.role || []
        : activeSegment === 'skill'
          ? data?.skill || []
          : data?.tier || [];

  const filteredData = currentData.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase()),
  );

  const kpis = data?.kpis || {
    totalCandidates: 0,
    totalPlaced: 0,
    avgPlacementRate: 0,
    avgScore: 0,
  };

  const chartYMax = Math.max(100, ...filteredData.map((d) => d.avgScore), 1);

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Users size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D1B3E]">Candidate Segmentation</h1>
            <p className="text-xs sm:text-sm text-[#6B7A99] mt-0.5">
              Cohort analysis by institution, role, experience, and performance tier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-600 border border-[#E8ECF4] rounded-lg text-[#6B7A99] hover:bg-[#F4F6FA] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setCompareMode(!compareMode)}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-600 border rounded-lg transition-all min-h-[40px] ${
              compareMode
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:bg-[#F4F6FA]'
            }`}
          >
            <BarChart2 size={14} /> {compareMode ? 'Exit Compare' : 'Compare Mode'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Total Candidates',
            value: loading ? '—' : kpis.totalCandidates.toLocaleString(),
            icon: <Users size={16} />,
            color: 'text-violet-600',
            bg: 'bg-violet-50',
          },
          {
            label: 'Total Placed',
            value: loading ? '—' : kpis.totalPlaced.toLocaleString(),
            icon: <Award size={16} />,
            color: 'text-emerald-600',
            bg: 'bg-emerald-50',
          },
          {
            label: 'Avg Placement Rate',
            value: loading ? '—' : `${kpis.avgPlacementRate}%`,
            icon: <Target size={16} />,
            color: 'text-teal-600',
            bg: 'bg-teal-50',
          },
          {
            label: 'Avg Score',
            value: loading ? '—' : `${kpis.avgScore}%`,
            icon: <TrendingUp size={16} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50',
          },
        ].map((k) => (
          <div key={k.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center ${k.color} shrink-0`}>
              {k.icon}
            </div>
            <div>
              <p className="text-lg font-800 text-[#0D1B3E]">{k.value}</p>
              <p className="text-xs text-[#6B7A99]">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {!loading && data?.empty && (
        <div className="rounded-xl border border-dashed border-[#E8ECF4] bg-white px-6 py-10 text-center">
          <Users size={28} className="text-[#D1D9E6] mx-auto mb-2" />
          <p className="text-sm font-600 text-[#0D1B3E]">No candidates to segment yet</p>
          <p className="text-xs text-[#6B7A99] mt-1">Import candidates or run interviews to populate cohorts.</p>
        </div>
      )}

      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-none">
        {SEGMENT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSegment(tab.id)}
            className={[
              'flex items-center gap-1.5 px-4 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap min-h-[44px]',
              activeSegment === tab.id
                ? 'border-violet-600 text-violet-600'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading cohorts…
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">
                Placement Rate by {SEGMENT_TABS.find((t) => t.id === activeSegment)?.label.replace(/^By /, '')}
              </h3>
              {filteredData.length === 0 ? (
                <p className="text-xs text-[#6B7A99] py-10 text-center">No cohorts in this segment.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredData.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, 'Placement Rate']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }}
                    />
                    <Bar dataKey="placementRate" fill="#7C3AED" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">
                Average Score by {SEGMENT_TABS.find((t) => t.id === activeSegment)?.label.replace(/^By /, '')}
              </h3>
              {filteredData.length === 0 ? (
                <p className="text-xs text-[#6B7A99] py-10 text-center">No scored cohorts yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={filteredData.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#6B7A99' }}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, chartYMax]}
                    />
                    <Tooltip
                      formatter={(v: number) => [`${v}%`, 'Avg Score']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }}
                    />
                    <Bar dataKey="avgScore" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
            <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Outcome Tracking — Enrollment → Placement Funnel</h3>
            <p className="text-xs text-[#6B7A99] mb-4">Monthly cohort progression across stages</p>
            {(data?.outcomeTimeline?.length || 0) === 0 ? (
              <p className="text-xs text-[#6B7A99] py-10 text-center">Not enough historical data for a funnel chart.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data!.outcomeTimeline} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="enrolled" stroke="#6366F1" strokeWidth={2} dot={false} name="Enrolled" />
                  <Line type="monotone" dataKey="assessed" stroke="#0D9488" strokeWidth={2} dot={false} name="Assessed" />
                  <Line type="monotone" dataKey="interviewed" stroke="#F59E0B" strokeWidth={2} dot={false} name="Interviewed" />
                  <Line type="monotone" dataKey="placed" stroke="#10B981" strokeWidth={2} dot={false} name="Placed" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {activeSegment === 'institution' && (data?.radarLabels?.length || 0) > 0 && (
            <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
              <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Multi-Dimension Comparison — Top Institutions</h3>
              <p className="text-xs text-[#6B7A99] mb-4">Radar chart comparing performance across 5 dimensions</p>
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={data!.radarData}>
                  <PolarGrid stroke="#E8ECF4" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7A99' }} />
                  {(data?.radarLabels || []).map((label, i) => (
                    <Radar
                      key={label}
                      name={label}
                      dataKey={`i${i}`}
                      stroke={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fill={RADAR_COLORS[i % RADAR_COLORS.length]}
                      fillOpacity={0.15}
                    />
                  ))}
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-[#E8ECF4]">
              <h3 className="text-sm font-700 text-[#0D1B3E] flex-1">
                Cohort Details{compareMode && filteredData.length >= 2 ? ' · comparing top rows' : ''}
              </h3>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search cohorts..."
                  className="pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 w-full sm:w-48"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-[#E8ECF4] bg-[#F8FAFC]">
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide w-10">S.No</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Cohort</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Candidates</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Placed</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Placement Rate</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Avg Score</th>
                    <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wide">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {(compareMode ? filteredData.slice(0, 2) : filteredData).map((row, i) => (
                    <tr
                      key={`${row.name}-${i}`}
                      className={`border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors ${
                        compareMode ? 'bg-violet-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{i + 1}</td>
                      <td className="px-4 py-3 font-600 text-[#0D1B3E]">{row.name}</td>
                      <td className="px-4 py-3 text-[#6B7A99]">{row.candidates}</td>
                      <td className="px-4 py-3 text-[#6B7A99]">{row.placed}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden max-w-[80px]">
                            <div
                              className="h-full bg-violet-500 rounded-full"
                              style={{ width: `${Math.min(100, row.placementRate)}%` }}
                            />
                          </div>
                          <span className="text-sm font-700 text-[#0D1B3E]">{row.placementRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-sm font-700 ${
                            row.avgScore >= 85
                              ? 'text-emerald-600'
                              : row.avgScore >= 75
                                ? 'text-blue-600'
                                : 'text-amber-600'
                          }`}
                        >
                          {row.avgScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`flex items-center gap-1 text-xs font-700 ${
                            row.trend >= 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}
                        >
                          {row.trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                          {Math.abs(row.trend)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-sm text-[#6B7A99]">
                        No matching cohorts
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
