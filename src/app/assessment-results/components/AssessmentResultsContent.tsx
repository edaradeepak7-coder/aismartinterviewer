'use client';
import React, { useState } from 'react';
import { BarChart2, Users, Award, Clock, CheckCircle2, Download, Search, Target, Code2, CheckSquare, FileText, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

interface CandidateResult {
  id: string;
  name: string;
  email: string;
  score: number;
  totalPoints: number;
  timeTaken: number;
  mcqScore: number;
  codingScore: number;
  subjectiveScore: number;
  status: 'passed' | 'failed' | 'pending';
  completedAt: string;
  rank: number;
}

const MOCK_RESULTS: CandidateResult[] = [
  { id: 'c1', name: 'Arjun Sharma', email: 'arjun@iitb.ac.in', score: 118, totalPoints: 150, timeTaken: 72, mcqScore: 10, codingScore: 68, subjectiveScore: 40, status: 'passed', completedAt: '2026-09-04 14:32', rank: 1 },
  { id: 'c2', name: 'Priya Mehta', email: 'priya@bits.ac.in', score: 105, totalPoints: 150, timeTaken: 85, mcqScore: 10, codingScore: 55, subjectiveScore: 40, status: 'passed', completedAt: '2026-09-04 15:10', rank: 2 },
  { id: 'c3', name: 'Rahul Verma', email: 'rahul@nit.ac.in', score: 92, totalPoints: 150, timeTaken: 88, mcqScore: 10, codingScore: 42, subjectiveScore: 40, status: 'passed', completedAt: '2026-09-04 16:05', rank: 3 },
  { id: 'c4', name: 'Sneha Patel', email: 'sneha@vit.ac.in', score: 78, totalPoints: 150, timeTaken: 90, mcqScore: 8, codingScore: 30, subjectiveScore: 40, status: 'passed', completedAt: '2026-09-04 16:45', rank: 4 },
  { id: 'c5', name: 'Kiran Rao', email: 'kiran@manipal.edu', score: 61, totalPoints: 150, timeTaken: 90, mcqScore: 6, codingScore: 25, subjectiveScore: 30, status: 'failed', completedAt: '2026-09-04 17:20', rank: 5 },
  { id: 'c6', name: 'Divya Nair', email: 'divya@pes.edu', score: 55, totalPoints: 150, timeTaken: 78, mcqScore: 5, codingScore: 20, subjectiveScore: 30, status: 'failed', completedAt: '2026-09-04 17:55', rank: 6 },
  { id: 'c7', name: 'Amit Kumar', email: 'amit@srm.edu', score: 48, totalPoints: 150, timeTaken: 65, mcqScore: 8, codingScore: 10, subjectiveScore: 30, status: 'failed', completedAt: '2026-09-04 18:30', rank: 7 },
  { id: 'c8', name: 'Riya Singh', email: 'riya@lpu.edu', score: 0, totalPoints: 150, timeTaken: 0, mcqScore: 0, codingScore: 0, subjectiveScore: 0, status: 'pending', completedAt: '—', rank: 0 },
];

const scoreDistribution = [
  { range: '0–20%', count: 1 },
  { range: '21–40%', count: 2 },
  { range: '41–60%', count: 2 },
  { range: '61–80%', count: 1 },
  { range: '81–100%', count: 2 },
];

const questionPerformance = [
  { question: 'Q1 MCQ', correct: 6, incorrect: 1, skipped: 0 },
  { question: 'Q2 Coding', correct: 4, incorrect: 2, skipped: 1 },
  { question: 'Q3 Subjective', correct: 5, incorrect: 1, skipped: 1 },
];

const timeData = [
  { name: 'Arjun', time: 72 },
  { name: 'Priya', time: 85 },
  { name: 'Rahul', time: 88 },
  { name: 'Sneha', time: 90 },
  { name: 'Kiran', time: 90 },
  { name: 'Divya', time: 78 },
  { name: 'Amit', time: 65 },
];

const PIE_COLORS = ['#0D9488', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AssessmentResultsContent() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const completed = MOCK_RESULTS.filter(r => r.status !== 'pending');
  const passed = MOCK_RESULTS.filter(r => r.status === 'passed');
  const avgScore = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + Math.round((r.score / r.totalPoints) * 100), 0) / completed.length) : 0;
  const avgTime = completed.length > 0 ? Math.round(completed.reduce((s, r) => s + r.timeTaken, 0) / completed.length) : 0;

  const filtered = MOCK_RESULTS.filter(r => {
    const matchSearch = !search || r.name.toLowerCase().includes(search.toLowerCase()) || r.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpis = [
    { label: 'Candidates Assigned', value: MOCK_RESULTS.length, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: completed.length, icon: <CheckCircle2 size={18} />, color: 'bg-green-50 text-green-600' },
    { label: 'Pass Rate', value: `${Math.round((passed.length / completed.length) * 100)}%`, icon: <Target size={18} />, color: 'bg-teal-50 text-teal-600' },
    { label: 'Avg Score', value: `${avgScore}%`, icon: <Award size={18} />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Avg Time', value: `${avgTime}m`, icon: <Clock size={18} />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Top Score', value: `${Math.round((Math.max(...completed.map(r => r.score)) / 150) * 100)}%`, icon: <Star size={18} />, color: 'bg-rose-50 text-rose-600' },
  ];

  const statusColors: Record<string, string> = {
    passed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D1B3E] flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">Assessment Results</h1>
            <p className="text-sm text-[#6B7A99]">Full Stack Developer — Pre-Interview · 48 candidates assigned</p>
          </div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-[#DDE3EE] bg-white text-[#3D5A80] rounded-lg text-sm font-600 hover:border-[#0D9488] hover:text-[#0D9488] transition-colors">
          <Download size={14} /> Export CSV
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white border border-[#DDE3EE] rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.color}`}>{kpi.icon}</div>
            <p className="text-xs text-[#6B7A99] mb-0.5">{kpi.label}</p>
            <p className="font-700 text-lg text-[#0D1B3E]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Score Distribution */}
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
          <h3 className="font-700 text-sm text-[#0D1B3E] mb-4">Score Distribution</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={scoreDistribution} barSize={28}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
              <XAxis dataKey="range" tick={{ fontSize: 10, fill: '#6B7A99' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3EE' }} />
              <Bar dataKey="count" fill="#0D9488" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Question Performance */}
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
          <h3 className="font-700 text-sm text-[#0D1B3E] mb-4">Question Performance</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={questionPerformance} barSize={16}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
              <XAxis dataKey="question" tick={{ fontSize: 10, fill: '#6B7A99' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3EE' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="correct" fill="#0D9488" radius={[4, 4, 0, 0]} name="Correct" />
              <Bar dataKey="incorrect" fill="#EF4444" radius={[4, 4, 0, 0]} name="Incorrect" />
              <Bar dataKey="skipped" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Skipped" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Time Taken */}
        <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
          <h3 className="font-700 text-sm text-[#0D1B3E] mb-4">Time Taken (minutes)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} />
              <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} domain={[0, 100]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3EE' }} />
              <Line type="monotone" dataKey="time" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Score Breakdown by Type */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { type: 'MCQ', icon: <CheckSquare size={16} />, color: 'bg-blue-50 text-blue-600', avg: Math.round(completed.reduce((s, r) => s + r.mcqScore, 0) / completed.length), max: 10 },
          { type: 'Coding', icon: <Code2 size={16} />, color: 'bg-violet-50 text-violet-600', avg: Math.round(completed.reduce((s, r) => s + r.codingScore, 0) / completed.length), max: 30 },
          { type: 'Subjective', icon: <FileText size={16} />, color: 'bg-amber-50 text-amber-600', avg: Math.round(completed.reduce((s, r) => s + r.subjectiveScore, 0) / completed.length), max: 40 },
        ].map(item => (
          <div key={item.type} className="bg-white border border-[#DDE3EE] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
              <span className="font-700 text-sm text-[#0D1B3E]">{item.type} Questions</span>
            </div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-700 text-[#0D1B3E]">{item.avg}</span>
              <span className="text-sm text-[#6B7A99] mb-1">/ {item.max} avg pts</span>
            </div>
            <div className="h-2 bg-[#F4F6FA] rounded-full overflow-hidden">
              <div className="h-full bg-[#0D9488] rounded-full" style={{ width: `${Math.round((item.avg / item.max) * 100)}%` }} />
            </div>
            <p className="text-xs text-[#6B7A99] mt-1.5">{Math.round((item.avg / item.max) * 100)}% average</p>
          </div>
        ))}
      </div>

      {/* Candidate Results Table */}
      <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#DDE3EE] flex items-center justify-between gap-4">
          <h3 className="font-700 text-sm text-[#0D1B3E]">Candidate Results</h3>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-sm border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#0D9488] w-48"
              />
            </div>
            <div className="flex gap-1 bg-[#F4F6FA] rounded-lg p-1">
              {['all', 'passed', 'failed', 'pending'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-xs font-600 transition-all capitalize ${filterStatus === s ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#DDE3EE] bg-[#F9FAFB]">
                <th className="text-left px-5 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider w-10">S.No</th>
                <th className="text-left px-5 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Candidate</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Score</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">MCQ</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Coding</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Subjective</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Time</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-700 text-[#6B7A99] uppercase tracking-wider">Completed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F6FA]">
              {filtered.map((result, idx) => {
                const pct = result.totalPoints > 0 ? Math.round((result.score / result.totalPoints) * 100) : 0;
                return (
                  <tr key={result.id} className="hover:bg-[#FAFBFC] transition-colors">
                    <td className="px-5 py-3.5 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                    <td className="px-5 py-3.5">
                      {result.rank > 0 ? (
                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 ${result.rank === 1 ? 'bg-amber-50 text-amber-600' : result.rank === 2 ? 'bg-gray-100 text-gray-600' : result.rank === 3 ? 'bg-orange-50 text-orange-600' : 'bg-[#F4F6FA] text-[#6B7A99]'}`}>
                          {result.rank}
                        </span>
                      ) : <span className="text-[#DDE3EE] text-sm">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <p className="font-600 text-sm text-[#0D1B3E]">{result.name}</p>
                        <p className="text-xs text-[#6B7A99]">{result.email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className="font-700 text-sm text-[#0D1B3E]">{pct > 0 ? `${pct}%` : '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#3D5A80]">{result.mcqScore > 0 ? `${result.mcqScore}/10` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-[#3D5A80]">{result.codingScore > 0 ? `${result.codingScore}/30` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-[#3D5A80]">{result.subjectiveScore > 0 ? `${result.subjectiveScore}/40` : '—'}</td>
                    <td className="px-4 py-3.5 text-sm text-[#3D5A80]">{result.timeTaken > 0 ? `${result.timeTaken}m` : '—'}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-600 px-2 py-1 rounded-full border ${statusColors[result.status]}`}>
                        {result.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#6B7A99]">{result.completedAt}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
