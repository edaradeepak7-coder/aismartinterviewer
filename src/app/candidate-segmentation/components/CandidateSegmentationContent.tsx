'use client';
import React, { useState } from 'react';
import { Users, GraduationCap, Briefcase, Code2, TrendingUp, Award, Search, BarChart2, Target, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, LineChart, Line, Legend } from 'recharts';

type SegmentBy = 'institution' | 'role' | 'skill' | 'tier';

const SEGMENT_TABS: { id: SegmentBy; label: string; icon: React.ReactNode }[] = [
  { id: 'institution', label: 'By Institution', icon: <GraduationCap size={15} /> },
  { id: 'role', label: 'By Role', icon: <Briefcase size={15} /> },
  { id: 'skill', label: 'By Skill', icon: <Code2 size={15} /> },
  { id: 'tier', label: 'By Performance Tier', icon: <Award size={15} /> },
];

const institutionData = [
  { name: 'IIT Bombay', candidates: 142, placed: 118, avgScore: 87, placementRate: 83, trend: +5, courses: 34, assessments: 89 },
  { name: 'NIT Trichy', candidates: 98, placed: 74, avgScore: 81, placementRate: 76, trend: +3, courses: 28, assessments: 67 },
  { name: 'BITS Pilani', candidates: 87, placed: 71, avgScore: 84, placementRate: 82, trend: +7, courses: 31, assessments: 58 },
  { name: 'VIT Vellore', candidates: 203, placed: 141, avgScore: 74, placementRate: 69, trend: -2, courses: 42, assessments: 134 },
  { name: 'SRM Chennai', candidates: 176, placed: 105, avgScore: 71, placementRate: 60, trend: +1, courses: 38, assessments: 112 },
  { name: 'Manipal Uni', candidates: 134, placed: 88, avgScore: 76, placementRate: 66, trend: +4, courses: 29, assessments: 91 },
];

const roleData = [
  { name: 'Frontend Dev', candidates: 187, placed: 152, avgScore: 82, placementRate: 81, trend: +8, topSkill: 'React' },
  { name: 'Backend Eng', candidates: 214, placed: 168, avgScore: 85, placementRate: 79, trend: +5, topSkill: 'Java' },
  { name: 'Full Stack', candidates: 143, placed: 108, avgScore: 80, placementRate: 76, trend: +3, topSkill: 'Node.js' },
  { name: 'ML Engineer', candidates: 96, placed: 67, avgScore: 78, placementRate: 70, trend: +12, topSkill: 'Python' },
  { name: 'DevOps', candidates: 72, placed: 58, avgScore: 83, placementRate: 81, trend: +6, topSkill: 'Docker' },
  { name: 'Data Analyst', candidates: 88, placed: 61, avgScore: 76, placementRate: 69, trend: +2, topSkill: 'SQL' },
];

const skillData = [
  { name: 'React', candidates: 312, avgScore: 83, placementRate: 82, demand: 'High', trend: +9 },
  { name: 'Python', candidates: 287, avgScore: 79, placementRate: 76, demand: 'High', trend: +14 },
  { name: 'Java', candidates: 241, avgScore: 82, placementRate: 78, demand: 'High', trend: +4 },
  { name: 'Node.js', candidates: 198, avgScore: 80, placementRate: 77, demand: 'Medium', trend: +6 },
  { name: 'AWS', candidates: 156, avgScore: 85, placementRate: 84, demand: 'High', trend: +11 },
  { name: 'Docker', candidates: 134, avgScore: 84, placementRate: 82, demand: 'Medium', trend: +8 },
  { name: 'SQL', candidates: 289, avgScore: 77, placementRate: 73, demand: 'Medium', trend: +2 },
  { name: 'TypeScript', candidates: 167, avgScore: 81, placementRate: 79, demand: 'High', trend: +7 },
];

const tierData = [
  { name: 'Elite (90–100)', candidates: 48, placed: 47, avgScore: 94, placementRate: 98, avgTimeToHire: '12 days', topCompany: 'Google, Microsoft' },
  { name: 'High (80–89)', candidates: 134, placed: 121, avgScore: 84, placementRate: 90, avgTimeToHire: '18 days', topCompany: 'Razorpay, Flipkart' },
  { name: 'Mid (70–79)', candidates: 198, placed: 152, avgScore: 74, placementRate: 77, avgTimeToHire: '24 days', topCompany: 'Infosys, TCS' },
  { name: 'Developing (60–69)', candidates: 167, placed: 98, avgScore: 64, placementRate: 59, avgTimeToHire: '32 days', topCompany: 'Wipro, HCL' },
  { name: 'Beginner (<60)', candidates: 93, placed: 31, avgScore: 52, placementRate: 33, avgTimeToHire: '45 days', topCompany: 'Startups' },
];

const outcomeTimeline = [
  { month: 'Apr', enrolled: 120, assessed: 98, interviewed: 72, placed: 54 },
  { month: 'May', enrolled: 145, assessed: 118, interviewed: 89, placed: 67 },
  { month: 'Jun', enrolled: 132, assessed: 109, interviewed: 83, placed: 61 },
  { month: 'Jul', enrolled: 168, assessed: 142, interviewed: 108, placed: 84 },
  { month: 'Aug', enrolled: 187, assessed: 158, interviewed: 124, placed: 97 },
  { month: 'Sep', enrolled: 203, assessed: 171, interviewed: 138, placed: 112 },
];

const radarData = [
  { metric: 'Avg Score', IIT: 87, NIT: 81, BITS: 84, VIT: 74 },
  { metric: 'Placement %', IIT: 83, NIT: 76, BITS: 82, VIT: 69 },
  { metric: 'Completion', IIT: 91, NIT: 85, BITS: 88, VIT: 79 },
  { metric: 'Engagement', IIT: 88, NIT: 82, BITS: 86, VIT: 76 },
  { metric: 'Interview Pass', IIT: 85, NIT: 78, BITS: 83, VIT: 71 },
];

export default function CandidateSegmentationContent() {
  const [activeSegment, setActiveSegment] = useState<SegmentBy>('institution');
  const [search, setSearch] = useState('');
  const [compareMode, setCompareMode] = useState(false);

  const currentData = activeSegment === 'institution' ? institutionData
    : activeSegment === 'role' ? roleData
    : activeSegment === 'skill' ? skillData
    : tierData;

  const filteredData = currentData.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  const totalCandidates = currentData.reduce((s, d) => s + d.candidates, 0);
  const totalPlaced = currentData.reduce((s, d) => s + d.placed, 0);
  const avgPlacementRate = Math.round(currentData.reduce((s, d) => s + d.placementRate, 0) / currentData.length);
  const avgScore = Math.round(currentData.reduce((s, d) => s + d.avgScore, 0) / currentData.length);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
            <Users size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-800 text-[#0D1B3E]">Candidate Segmentation</h1>
            <p className="text-xs sm:text-sm text-[#6B7A99] mt-0.5">Cohort analysis by institution, role, skill, and performance tier</p>
          </div>
        </div>
        <button
          onClick={() => setCompareMode(!compareMode)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-600 border rounded-lg transition-all min-h-[40px] ${compareMode ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-[#6B7A99] border-[#E8ECF4] hover:bg-[#F4F6FA]'}`}
        >
          <BarChart2 size={14} /> {compareMode ? 'Exit Compare' : 'Compare Mode'}
        </button>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Candidates', value: totalCandidates.toLocaleString(), icon: <Users size={16} />, color: 'text-violet-600', bg: 'bg-violet-50' },
          { label: 'Total Placed', value: totalPlaced.toLocaleString(), icon: <Award size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Avg Placement Rate', value: `${avgPlacementRate}%`, icon: <Target size={16} />, color: 'text-teal-600', bg: 'bg-teal-50' },
          { label: 'Avg Score', value: `${avgScore}%`, icon: <TrendingUp size={16} />, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-[#E8ECF4] rounded-xl p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center ${k.color} shrink-0`}>{k.icon}</div>
            <div>
              <p className="text-lg font-800 text-[#0D1B3E]">{k.value}</p>
              <p className="text-xs text-[#6B7A99]">{k.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Segment Tabs */}
      <div className="flex gap-0 border-b border-[#E8ECF4] overflow-x-auto scrollbar-none">
        {SEGMENT_TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveSegment(tab.id)}
            className={['flex items-center gap-1.5 px-4 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px whitespace-nowrap min-h-[44px]',
              activeSegment === tab.id ? 'border-violet-600 text-violet-600' : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]'].join(' ')}>
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Placement Rate Bar Chart */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Placement Rate by {SEGMENT_TABS.find(t => t.id === activeSegment)?.label.replace('By ', '')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredData.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Placement Rate']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
              <Bar dataKey="placementRate" fill="#7C3AED" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Avg Score Bar Chart */}
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h3 className="text-sm font-700 text-[#0D1B3E] mb-4">Average Score by {SEGMENT_TABS.find(t => t.id === activeSegment)?.label.replace('By ', '')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={filteredData.slice(0, 6)} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} tickLine={false} axisLine={false} domain={[50, 100]} />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Avg Score']} contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
              <Bar dataKey="avgScore" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Outcome Tracking Timeline */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
        <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Outcome Tracking — Enrollment → Placement Funnel</h3>
        <p className="text-xs text-[#6B7A99] mb-4">Monthly cohort progression across all stages</p>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={outcomeTimeline} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
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
      </div>

      {/* Institution Comparison Radar (only for institution segment) */}
      {activeSegment === 'institution' && (
        <div className="bg-white border border-[#E8ECF4] rounded-xl p-5">
          <h3 className="text-sm font-700 text-[#0D1B3E] mb-1">Multi-Dimension Comparison — Top 4 Institutions</h3>
          <p className="text-xs text-[#6B7A99] mb-4">Radar chart comparing performance across 5 dimensions</p>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#E8ECF4" />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7A99' }} />
              <Radar name="IIT Bombay" dataKey="IIT" stroke="#7C3AED" fill="#7C3AED" fillOpacity={0.15} />
              <Radar name="NIT Trichy" dataKey="NIT" stroke="#0D9488" fill="#0D9488" fillOpacity={0.15} />
              <Radar name="BITS Pilani" dataKey="BITS" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.15} />
              <Radar name="VIT Vellore" dataKey="VIT" stroke="#EF4444" fill="#EF4444" fillOpacity={0.15} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Cohort Table */}
      <div className="bg-white border border-[#E8ECF4] rounded-xl overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-[#E8ECF4]">
          <h3 className="text-sm font-700 text-[#0D1B3E] flex-1">Cohort Details</h3>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cohorts..." className="pl-9 pr-4 py-2 text-sm border border-[#E8ECF4] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 w-full sm:w-48" />
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
              {filteredData.map((row, i) => (
                <tr key={i} className="border-b border-[#F4F6FA] hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-4 py-3 text-xs text-[#6B7A99] font-600">{i + 1}</td>
                  <td className="px-4 py-3 font-600 text-[#0D1B3E]">{row.name}</td>
                  <td className="px-4 py-3 text-[#6B7A99]">{row.candidates}</td>
                  <td className="px-4 py-3 text-[#6B7A99]">{row.placed}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden max-w-[80px]">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${row.placementRate}%` }} />
                      </div>
                      <span className="text-sm font-700 text-[#0D1B3E]">{row.placementRate}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-sm font-700 ${row.avgScore >= 85 ? 'text-emerald-600' : row.avgScore >= 75 ? 'text-blue-600' : 'text-amber-600'}`}>{row.avgScore}%</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1 text-xs font-700 ${(row as any).trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {(row as any).trend >= 0 ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                      {Math.abs((row as any).trend)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
