'use client';
import React, { useState } from 'react';
import { BarChart, Bar, Funnel, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, AreaChart, Area } from 'recharts';
import { Users, TrendingUp, TrendingDown, ArrowRight, UserCheck, UserX, Zap, Filter } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
type SegmentFilter = 'all' | 'candidate' | 'recruiter' | 'institution';
type CohortPeriod = 'weekly' | 'monthly';

// ─── Mock Cohort Data ─────────────────────────────────────────────────────────
const cohortRetentionData = [
  { cohort: 'Apr 2026', size: 420, w0: 100, w1: 72, w2: 58, w3: 47, w4: 41, w5: 36, w6: 33, w7: 30, w8: 28 },
  { cohort: 'May 2026', size: 510, w0: 100, w1: 75, w2: 61, w3: 50, w4: 44, w5: 39, w6: 35, w7: 32, w8: 29 },
  { cohort: 'Jun 2026', size: 630, w0: 100, w1: 78, w2: 64, w3: 53, w4: 46, w5: 41, w6: 37, w7: 34, w8: null },
  { cohort: 'Jul 2026', size: 740, w0: 100, w1: 80, w2: 67, w3: 55, w4: 48, w5: 43, w6: 39, w7: null, w8: null },
  { cohort: 'Aug 2026', size: 890, w0: 100, w1: 82, w2: 69, w3: 57, w4: 50, w5: 44, w6: null, w7: null, w8: null },
  { cohort: 'Sep 2026', size: 1020, w0: 100, w1: 84, w2: 71, w3: 59, w4: null, w5: null, w6: null, w7: null, w8: null },
];

const trialToPaidCohort = [
  { cohort: 'Apr 2026', trialStart: 420, day7: 38, day14: 52, day30: 61, day60: 68 },
  { cohort: 'May 2026', trialStart: 510, day7: 41, day14: 56, day30: 64, day60: 71 },
  { cohort: 'Jun 2026', trialStart: 630, day7: 44, day14: 59, day30: 67, day60: 73 },
  { cohort: 'Jul 2026', trialStart: 740, day7: 46, day14: 62, day30: 70, day60: null },
  { cohort: 'Aug 2026', trialStart: 890, day7: 48, day14: 64, day30: null, day60: null },
  { cohort: 'Sep 2026', trialStart: 1020, day7: 51, day14: null, day30: null, day60: null },
];

// ─── Funnel Data by Segment ───────────────────────────────────────────────────
const funnelDataBySegment: Record<SegmentFilter, { name: string; value: number; color: string; pct: number }[]> = {
  all: [
    { name: 'Signups', value: 12847, color: '#3B82F6', pct: 100 },
    { name: 'Profile Complete', value: 9840, color: '#6366F1', pct: 77 },
    { name: 'First Interview', value: 6210, color: '#8B5CF6', pct: 48 },
    { name: 'Interview Completed', value: 4890, color: '#0D9488', pct: 38 },
    { name: 'Plan Upgrade', value: 2140, color: '#F59E0B', pct: 17 },
    { name: 'Active Subscriber', value: 1680, color: '#10B981', pct: 13 },
  ],
  candidate: [
    { name: 'Signups', value: 8420, color: '#3B82F6', pct: 100 },
    { name: 'Profile Complete', value: 6730, color: '#6366F1', pct: 80 },
    { name: 'First Interview', value: 4890, color: '#8B5CF6', pct: 58 },
    { name: 'Interview Completed', value: 3940, color: '#0D9488', pct: 47 },
    { name: 'Plan Upgrade', value: 1420, color: '#F59E0B', pct: 17 },
    { name: 'Active Subscriber', value: 1080, color: '#10B981', pct: 13 },
  ],
  recruiter: [
    { name: 'Signups', value: 2140, color: '#3B82F6', pct: 100 },
    { name: 'Profile Complete', value: 1820, color: '#6366F1', pct: 85 },
    { name: 'First Interview', value: 980, color: '#8B5CF6', pct: 46 },
    { name: 'Interview Completed', value: 720, color: '#0D9488', pct: 34 },
    { name: 'Plan Upgrade', value: 480, color: '#F59E0B', pct: 22 },
    { name: 'Active Subscriber', value: 390, color: '#10B981', pct: 18 },
  ],
  institution: [
    { name: 'Signups', value: 284, color: '#3B82F6', pct: 100 },
    { name: 'Profile Complete', value: 261, color: '#6366F1', pct: 92 },
    { name: 'First Interview', value: 198, color: '#8B5CF6', pct: 70 },
    { name: 'Interview Completed', value: 172, color: '#0D9488', pct: 61 },
    { name: 'Plan Upgrade', value: 148, color: '#F59E0B', pct: 52 },
    { name: 'Active Subscriber', value: 131, color: '#10B981', pct: 46 },
  ],
};

// ─── Dropout Points ───────────────────────────────────────────────────────────
const dropoutBySegment: Record<SegmentFilter, { stage: string; dropRate: number; count: number; reason: string }[]> = {
  all: [
    { stage: 'Signup → Profile', dropRate: 23, count: 3007, reason: 'Incomplete onboarding flow' },
    { stage: 'Profile → Interview', dropRate: 37, count: 3630, reason: 'No interview scheduled' },
    { stage: 'Interview → Complete', dropRate: 21, count: 1320, reason: 'Technical issues / dropped' },
    { stage: 'Complete → Upgrade', dropRate: 56, count: 2750, reason: 'Price sensitivity' },
    { stage: 'Upgrade → Active', dropRate: 22, count: 460, reason: 'Low engagement post-upgrade' },
  ],
  candidate: [
    { stage: 'Signup → Profile', dropRate: 20, count: 1690, reason: 'Incomplete onboarding flow' },
    { stage: 'Profile → Interview', dropRate: 27, count: 1840, reason: 'No interview scheduled' },
    { stage: 'Interview → Complete', dropRate: 19, count: 950, reason: 'Technical issues / dropped' },
    { stage: 'Complete → Upgrade', dropRate: 64, count: 2520, reason: 'Price sensitivity' },
    { stage: 'Upgrade → Active', dropRate: 24, count: 340, reason: 'Low engagement post-upgrade' },
  ],
  recruiter: [
    { stage: 'Signup → Profile', dropRate: 15, count: 320, reason: 'Missing company details' },
    { stage: 'Profile → Interview', dropRate: 46, count: 840, reason: 'No candidates in pipeline' },
    { stage: 'Interview → Complete', dropRate: 27, count: 260, reason: 'Candidate no-show' },
    { stage: 'Complete → Upgrade', dropRate: 33, count: 240, reason: 'Evaluating ROI' },
    { stage: 'Upgrade → Active', dropRate: 19, count: 90, reason: 'Low hiring volume' },
  ],
  institution: [
    { stage: 'Signup → Profile', dropRate: 8, count: 23, reason: 'Admin approval pending' },
    { stage: 'Profile → Interview', dropRate: 24, count: 63, reason: 'Faculty onboarding delay' },
    { stage: 'Interview → Complete', dropRate: 13, count: 26, reason: 'Student scheduling conflicts' },
    { stage: 'Complete → Upgrade', dropRate: 14, count: 24, reason: 'Budget approval cycle' },
    { stage: 'Upgrade → Active', dropRate: 11, count: 17, reason: 'Integration setup time' },
  ],
};

// ─── Retention Trend ─────────────────────────────────────────────────────────
const retentionTrend = [
  { month: 'Apr', d7: 72, d30: 41, d60: 28 },
  { month: 'May', d7: 75, d30: 44, d60: 31 },
  { month: 'Jun', d7: 78, d30: 46, d60: 33 },
  { month: 'Jul', d7: 80, d30: 48, d60: 35 },
  { month: 'Aug', d7: 82, d30: 50, d60: 37 },
  { month: 'Sep', d7: 84, d30: 51, d60: null },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getRetentionColor(value: number | null): string {
  if (value === null) return 'bg-gray-100 text-gray-400';
  if (value >= 70) return 'bg-emerald-100 text-emerald-800 font-700';
  if (value >= 50) return 'bg-teal-50 text-teal-700 font-600';
  if (value >= 35) return 'bg-amber-50 text-amber-700 font-600';
  if (value >= 20) return 'bg-orange-50 text-orange-700';
  return 'bg-red-50 text-red-700';
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-xl shadow-lg px-3 py-2.5 text-xs">
      <p className="font-700 text-[#0D1B3E] mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-600">{p.name}: {p.value}{typeof p.value === 'number' && p.name !== 'Users' ? '%' : ''}</p>
      ))}
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, icon, color, trend }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string; trend?: { val: string; up: boolean } }) {
  return (
    <div className="bg-white border border-[#E8ECF4] rounded-2xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>{icon}</div>
        {trend && (
          <span className={`flex items-center gap-1 text-xs font-600 ${trend.up ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {trend.val}
          </span>
        )}
      </div>
      <p className="text-2xl font-800 text-[#0D1B3E]">{value}</p>
      <p className="text-xs font-600 text-[#6B7A99] mt-0.5">{label}</p>
      {sub && <p className="text-[11px] text-[#6B7A99] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CohortAnalyticsContent() {
  const [segment, setSegment] = useState<SegmentFilter>('all');
  const [cohortPeriod, setCohortPeriod] = useState<CohortPeriod>('monthly');

  const funnelData = funnelDataBySegment[segment];
  const dropoutData = dropoutBySegment[segment];

  const SEGMENT_TABS: { id: SegmentFilter; label: string }[] = [
    { id: 'all', label: 'All Users' },
    { id: 'candidate', label: 'Candidates' },
    { id: 'recruiter', label: 'Recruiters' },
    { id: 'institution', label: 'Institutions' },
  ];

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-800 text-[#0D1B3E]">Cohort & Funnel Analytics</h1>
          <p className="text-sm text-[#6B7A99] mt-0.5">Retention cohorts, feature adoption funnels, and dropout analysis per user segment</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-3 py-2 shadow-sm">
          <Filter size={14} className="text-[#6B7A99]" />
          <span className="text-xs text-[#6B7A99] font-600">Segment:</span>
          {SEGMENT_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setSegment(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-600 transition-all ${segment === t.id ? 'bg-[#0D9488] text-white' : 'text-[#6B7A99] hover:bg-[#F4F6FA]'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Signups" value={funnelData[0].value.toLocaleString()} sub="All time" icon={<Users size={18} />} color="bg-blue-50 text-blue-600" trend={{ val: '+8.2%', up: true }} />
        <KPICard label="Trial → Paid Conv." value="17%" sub="Avg across cohorts" icon={<Zap size={18} />} color="bg-amber-50 text-amber-600" trend={{ val: '+2.1%', up: true }} />
        <KPICard label="D-30 Retention" value="51%" sub="Sep 2026 cohort" icon={<UserCheck size={18} />} color="bg-emerald-50 text-emerald-600" trend={{ val: '+3.4%', up: true }} />
        <KPICard label="Avg Dropout Rate" value="28%" sub="Signup → Active" icon={<UserX size={18} />} color="bg-red-50 text-red-600" trend={{ val: '-1.8%', up: true }} />
      </div>

      {/* ── Section 1: Cohort Retention Table (Trial → Paid) ── */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF4]">
          <div>
            <h2 className="text-base font-800 text-[#0D1B3E]">Cohort Retention Table — Trial → Paid</h2>
            <p className="text-xs text-[#6B7A99] mt-0.5">% of users retained per week after signup (heat-mapped)</p>
          </div>
          <div className="flex gap-1 bg-[#F4F6FA] rounded-lg p-1">
            {(['weekly', 'monthly'] as CohortPeriod[]).map(p => (
              <button key={p} onClick={() => setCohortPeriod(p)} className={`px-3 py-1 rounded-md text-xs font-600 transition-all ${cohortPeriod === p ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-700 text-[#6B7A99] whitespace-nowrap w-10">S.No</th>
                <th className="text-left px-4 py-3 font-700 text-[#6B7A99] whitespace-nowrap">Cohort</th>
                <th className="text-right px-3 py-3 font-700 text-[#6B7A99]">Size</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W0</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W1</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W2</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W3</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W4</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W5</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W6</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W7</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">W8</th>
              </tr>
            </thead>
            <tbody>
              {cohortRetentionData.map((row, i) => (
                <tr key={row.cohort} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}>
                  <td className="px-4 py-2.5 text-xs text-[#6B7A99] font-600">{i + 1}</td>
                  <td className="px-4 py-2.5 font-700 text-[#0D1B3E] whitespace-nowrap">{row.cohort}</td>
                  <td className="px-3 py-2.5 text-right font-600 text-[#6B7A99]">{row.size.toLocaleString()}</td>
                  {(['w0', 'w1', 'w2', 'w3', 'w4', 'w5', 'w6', 'w7', 'w8'] as const).map(w => (
                    <td key={w} className="px-3 py-2.5 text-center">
                      {row[w] !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${getRetentionColor(row[w] as number)}`}>
                          {row[w]}%
                        </span>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-3 border-t border-[#E8ECF4] bg-[#F8FAFC]">
          <span className="text-[10px] text-[#6B7A99] font-600">Retention Heat:</span>
          {[{ label: '≥70%', cls: 'bg-emerald-100 text-emerald-800' }, { label: '50–69%', cls: 'bg-teal-50 text-teal-700' }, { label: '35–49%', cls: 'bg-amber-50 text-amber-700' }, { label: '20–34%', cls: 'bg-orange-50 text-orange-700' }, { label: '<20%', cls: 'bg-red-50 text-red-700' }].map(l => (
            <span key={l.label} className={`px-2 py-0.5 rounded text-[10px] font-600 ${l.cls}`}>{l.label}</span>
          ))}
        </div>
      </div>

      {/* ── Section 2: Trial → Paid Conversion Cohort ── */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF4]">
          <h2 className="text-base font-800 text-[#0D1B3E]">Trial → Paid Conversion by Cohort</h2>
          <p className="text-xs text-[#6B7A99] mt-0.5">% of trial users who converted to paid plan at Day 7, 14, 30, 60</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F8FAFC]">
                <th className="text-left px-4 py-3 font-700 text-[#6B7A99] w-10">S.No</th>
                <th className="text-left px-4 py-3 font-700 text-[#6B7A99]">Cohort</th>
                <th className="text-right px-3 py-3 font-700 text-[#6B7A99]">Trial Users</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">Day 7</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">Day 14</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">Day 30</th>
                <th className="text-center px-3 py-3 font-700 text-[#6B7A99]">Day 60</th>
              </tr>
            </thead>
            <tbody>
              {trialToPaidCohort.map((row, i) => (
                <tr key={row.cohort} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFC]'}>
                  <td className="px-4 py-2.5 text-xs text-[#6B7A99] font-600">{i + 1}</td>
                  <td className="px-4 py-2.5 font-700 text-[#0D1B3E]">{row.cohort}</td>
                  <td className="px-3 py-2.5 text-right font-600 text-[#6B7A99]">{row.trialStart.toLocaleString()}</td>
                  {(['day7', 'day14', 'day30', 'day60'] as const).map(d => (
                    <td key={d} className="px-3 py-2.5 text-center">
                      {row[d] !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${getRetentionColor(row[d] as number)}`}>
                          {row[d]}%
                        </span>
                      ) : (
                        <span className="text-[#D1D5DB]">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 3: Feature Adoption Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Funnel Chart */}
        <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-800 text-[#0D1B3E] mb-1">Feature Adoption Funnel</h2>
          <p className="text-xs text-[#6B7A99] mb-5">Signup → Interview → Upgrade — {segment === 'all' ? 'All Users' : segment.charAt(0).toUpperCase() + segment.slice(1) + 's'}</p>
          <div className="space-y-3">
            {funnelData.map((step, i) => {
              const prevVal = i > 0 ? funnelData[i - 1].value : step.value;
              const dropFromPrev = i > 0 ? Math.round(((prevVal - step.value) / prevVal) * 100) : 0;
              return (
                <div key={step.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-600 text-[#0D1B3E]">{step.name}</span>
                    <div className="flex items-center gap-3">
                      {i > 0 && (
                        <span className="text-[10px] text-red-500 font-600">-{dropFromPrev}% drop</span>
                      )}
                      <span className="text-xs font-700 text-[#0D1B3E]">{step.value.toLocaleString()}</span>
                      <span className="text-[10px] text-[#6B7A99] w-8 text-right">{step.pct}%</span>
                    </div>
                  </div>
                  <div className="h-7 bg-[#F4F6FA] rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg flex items-center px-2.5 transition-all duration-500"
                      style={{ width: `${Math.max(4, step.pct)}%`, backgroundColor: step.color }}
                    >
                      <span className="text-[10px] font-700 text-white truncate">{step.value.toLocaleString()}</span>
                    </div>
                  </div>
                  {i < funnelData.length - 1 && (
                    <div className="flex justify-center mt-1">
                      <ArrowRight size={12} className="text-[#D1D5DB] rotate-90" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Funnel Bar Chart */}
        <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-800 text-[#0D1B3E] mb-1">Funnel Stage Comparison</h2>
          <p className="text-xs text-[#6B7A99] mb-4">Absolute user counts per funnel stage</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={funnelData} layout="vertical" barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Users" radius={[0, 4, 4, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Section 4: Dropout Points ── */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E8ECF4]">
          <h2 className="text-base font-800 text-[#0D1B3E]">Dropout Points by Segment</h2>
          <p className="text-xs text-[#6B7A99] mt-0.5">Where users disengage — {segment === 'all' ? 'All Users' : segment.charAt(0).toUpperCase() + segment.slice(1) + 's'}</p>
        </div>
        <div className="p-6 space-y-4">
          {dropoutData.map((item, i) => (
            <div key={item.stage} className="flex items-start gap-4">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-red-50 border border-red-200 flex items-center justify-center mt-0.5">
                <span className="text-[10px] font-800 text-red-600">{i + 1}</span>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-700 text-[#0D1B3E]">{item.stage}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[#6B7A99]">{item.count.toLocaleString()} users dropped</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-700 ${item.dropRate >= 40 ? 'bg-red-100 text-red-700' : item.dropRate >= 25 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {item.dropRate}% dropout
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden mb-1.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.dropRate >= 40 ? 'bg-red-400' : item.dropRate >= 25 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${item.dropRate}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#6B7A99]">
                  <span className="font-600">Primary reason:</span> {item.reason}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 5: Retention Trend Chart ── */}
      <div className="bg-white border border-[#E8ECF4] rounded-2xl shadow-sm p-6">
        <h2 className="text-base font-800 text-[#0D1B3E] mb-1">Retention Rate Trend</h2>
        <p className="text-xs text-[#6B7A99] mb-5">D-7, D-30, D-60 retention rates over time (all cohorts)</p>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={retentionTrend}>
            <defs>
              <linearGradient id="d7Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="d30Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0D9488" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="d60Grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#6B7A99' }} axisLine={false} tickLine={false} domain={[0, 100]} unit="%" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="d7" name="D-7 Retention" stroke="#3B82F6" strokeWidth={2} fill="url(#d7Grad)" dot={{ r: 3, fill: '#3B82F6' }} connectNulls={false} />
            <Area type="monotone" dataKey="d30" name="D-30 Retention" stroke="#0D9488" strokeWidth={2} fill="url(#d30Grad)" dot={{ r: 3, fill: '#0D9488' }} connectNulls={false} />
            <Area type="monotone" dataKey="d60" name="D-60 Retention" stroke="#8B5CF6" strokeWidth={2} fill="url(#d60Grad)" dot={{ r: 3, fill: '#8B5CF6' }} connectNulls={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
