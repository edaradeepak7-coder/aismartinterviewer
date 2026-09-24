'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart2, Users, Award, Clock, CheckCircle2, Download, Search, Target,
  Code2, CheckSquare, FileText, Star, Loader2, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { toast } from 'sonner';

interface CandidateResult {
  id: string;
  assessmentId: string;
  assessmentTitle: string;
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

interface AssessmentOption {
  id: string;
  title: string;
}

export default function AssessmentResultsContent() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [assessments, setAssessments] = useState<AssessmentOption[]>([]);
  const [assessmentId, setAssessmentId] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [aRes, rRes] = await Promise.all([
        fetch('/api/assessments?limit=50'),
        fetch(
          assessmentId
            ? `/api/assessment-results?assessment_id=${assessmentId}`
            : '/api/assessment-results',
        ),
      ]);
      const aJson = await aRes.json().catch(() => ({}));
      const rJson = await rRes.json().catch(() => ({}));
      if (!aRes.ok) throw new Error(aJson?.error || 'Failed to load assessments');
      if (!rRes.ok) throw new Error(rJson?.error || 'Failed to load results');

      const opts = (aJson.data || []).map((a: { id: string; title: string }) => ({
        id: a.id,
        title: a.title,
      }));
      setAssessments(opts);
      setResults((rJson.data || []) as CandidateResult[]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    load();
  }, [load]);

  const completed = results.filter((r) => r.status !== 'pending');
  const passed = results.filter((r) => r.status === 'passed');
  const avgScore =
    completed.length > 0
      ? Math.round(
          completed.reduce(
            (s, r) => s + Math.round((r.score / Math.max(1, r.totalPoints)) * 100),
            0,
          ) / completed.length,
        )
      : 0;
  const avgTime =
    completed.length > 0
      ? Math.round(completed.reduce((s, r) => s + r.timeTaken, 0) / completed.length)
      : 0;
  const topScore =
    completed.length > 0
      ? Math.round(
          (Math.max(...completed.map((r) => r.score)) /
            Math.max(1, completed[0]?.totalPoints || 100)) *
            100,
        )
      : 0;

  const filtered = results.filter((r) => {
    const matchSearch =
      !search ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.email.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const scoreDistribution = [
    { range: '0–20%', count: completed.filter((r) => (r.score / Math.max(1, r.totalPoints)) * 100 <= 20).length },
    { range: '21–40%', count: completed.filter((r) => { const p = (r.score / Math.max(1, r.totalPoints)) * 100; return p > 20 && p <= 40; }).length },
    { range: '41–60%', count: completed.filter((r) => { const p = (r.score / Math.max(1, r.totalPoints)) * 100; return p > 40 && p <= 60; }).length },
    { range: '61–80%', count: completed.filter((r) => { const p = (r.score / Math.max(1, r.totalPoints)) * 100; return p > 60 && p <= 80; }).length },
    { range: '81–100%', count: completed.filter((r) => (r.score / Math.max(1, r.totalPoints)) * 100 > 80).length },
  ];

  const timeData = completed.slice(0, 8).map((r) => ({
    name: r.name.split(' ')[0],
    time: r.timeTaken,
  }));

  const title =
    assessments.find((a) => a.id === assessmentId)?.title ||
    results[0]?.assessmentTitle ||
    'All assessments';

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error('No rows to export');
      return;
    }
    const header = [
      'rank',
      'name',
      'email',
      'score',
      'total',
      'mcq',
      'coding',
      'subjective',
      'time_min',
      'status',
      'completed_at',
    ];
    const lines = [
      header.join(','),
      ...filtered.map((r) =>
        [
          r.rank,
          JSON.stringify(r.name),
          JSON.stringify(r.email),
          r.score,
          r.totalPoints,
          r.mcqScore,
          r.codingScore,
          r.subjectiveScore,
          r.timeTaken,
          r.status,
          JSON.stringify(r.completedAt),
        ].join(','),
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `assessment-results-${assessmentId || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusColors: Record<string, string> = {
    passed: 'bg-green-50 text-green-700 border-green-200',
    failed: 'bg-red-50 text-red-700 border-red-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const kpis = [
    { label: 'Candidates Assigned', value: loading ? '—' : results.length, icon: <Users size={18} />, color: 'bg-blue-50 text-blue-600' },
    { label: 'Completed', value: loading ? '—' : completed.length, icon: <CheckCircle2 size={18} />, color: 'bg-green-50 text-green-600' },
    {
      label: 'Pass Rate',
      value: loading ? '—' : completed.length ? `${Math.round((passed.length / completed.length) * 100)}%` : '—',
      icon: <Target size={18} />,
      color: 'bg-teal-50 text-teal-600',
    },
    { label: 'Avg Score', value: loading ? '—' : `${avgScore}%`, icon: <Award size={18} />, color: 'bg-violet-50 text-violet-600' },
    { label: 'Avg Time', value: loading ? '—' : `${avgTime}m`, icon: <Clock size={18} />, color: 'bg-amber-50 text-amber-600' },
    { label: 'Top Score', value: loading ? '—' : `${topScore}%`, icon: <Star size={18} />, color: 'bg-rose-50 text-rose-600' },
  ];

  const mcqAvg = completed.length
    ? Math.round(completed.reduce((s, r) => s + r.mcqScore, 0) / completed.length)
    : 0;
  const codingAvg = completed.length
    ? Math.round(completed.reduce((s, r) => s + r.codingScore, 0) / completed.length)
    : 0;
  const subjAvg = completed.length
    ? Math.round(completed.reduce((s, r) => s + r.subjectiveScore, 0) / completed.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D1B3E] flex items-center justify-center">
            <BarChart2 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-700 text-[#0D1B3E]">Assessment Results</h1>
            <p className="text-sm text-[#6B7A99]">
              {title} · {results.length} candidate{results.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={assessmentId}
            onChange={(e) => setAssessmentId(e.target.value)}
            className="text-sm border border-[#DDE3EE] rounded-lg px-3 py-2 bg-white"
          >
            <option value="">All assessments</option>
            {assessments.map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="p-2 border border-[#DDE3EE] rounded-lg text-[#6B7A99] hover:border-[#0D9488]"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 border border-[#DDE3EE] bg-white text-[#3D5A80] rounded-lg text-sm font-600 hover:border-[#0D9488] hover:text-[#0D9488] transition-colors"
          >
            <Download size={14} /> Export CSV
          </button>
          <Link
            href="/assessments"
            className="px-4 py-2 bg-[#0D9488] text-white rounded-lg text-sm font-600 hover:bg-[#0b8276]"
          >
            Assessments
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#DDE3EE] rounded-xl p-4">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.color}`}>{kpi.icon}</div>
            <p className="text-xs text-[#6B7A99] mb-0.5">{kpi.label}</p>
            <p className="font-700 text-lg text-[#0D1B3E]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading results…
        </div>
      ) : results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DDE3EE] bg-white px-6 py-12 text-center">
          <p className="text-sm font-600 text-[#0D1B3E]">No results yet</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            Preview an assessment from the Assessments page to record a result.
          </p>
          <Link href="/assessments" className="inline-block mt-4 text-sm font-600 text-[#0D9488]">
            Go to Assessments →
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
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
            <div className="bg-white border border-[#DDE3EE] rounded-xl p-5">
              <h3 className="font-700 text-sm text-[#0D1B3E] mb-4">Time Taken (minutes)</h3>
              {timeData.length === 0 ? (
                <p className="text-xs text-[#6B7A99] py-10 text-center">No completed attempts</p>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={timeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F4F6FA" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7A99' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#6B7A99' }} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #DDE3EE' }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="time" stroke="#0D9488" strokeWidth={2} dot={{ fill: '#0D9488', r: 4 }} name="Minutes" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { type: 'MCQ', icon: <CheckSquare size={16} />, color: 'bg-blue-50 text-blue-600', avg: mcqAvg, max: Math.max(10, ...completed.map((r) => r.mcqScore), 10) },
              { type: 'Coding', icon: <Code2 size={16} />, color: 'bg-violet-50 text-violet-600', avg: codingAvg, max: Math.max(30, ...completed.map((r) => r.codingScore), 30) },
              { type: 'Subjective', icon: <FileText size={16} />, color: 'bg-amber-50 text-amber-600', avg: subjAvg, max: Math.max(40, ...completed.map((r) => r.subjectiveScore), 40) },
            ].map((item) => (
              <div key={item.type} className="bg-white border border-[#DDE3EE] rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color}`}>{item.icon}</div>
                  <span className="font-700 text-sm text-[#0D1B3E]">{item.type} Questions</span>
                </div>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-700 text-[#0D1B3E]">{item.avg}</span>
                  <span className="text-sm text-[#6B7A99] mb-1">avg pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border border-[#DDE3EE] rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-[#DDE3EE] flex items-center justify-between gap-4 flex-wrap">
              <h3 className="font-700 text-sm text-[#0D1B3E]">Candidate Results</h3>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7A99]" />
                  <input
                    type="text"
                    placeholder="Search candidates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-sm border border-[#DDE3EE] rounded-lg focus:outline-none focus:border-[#0D9488] w-48"
                  />
                </div>
                <div className="flex gap-1 bg-[#F4F6FA] rounded-lg p-1">
                  {['all', 'passed', 'failed', 'pending'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setFilterStatus(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-600 transition-all capitalize ${
                        filterStatus === s ? 'bg-white text-[#0D1B3E] shadow-sm' : 'text-[#6B7A99]'
                      }`}
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
                    const pct =
                      result.totalPoints > 0
                        ? Math.round((result.score / result.totalPoints) * 100)
                        : 0;
                    return (
                      <tr key={result.id} className="hover:bg-[#FAFBFC] transition-colors">
                        <td className="px-5 py-3.5 text-xs text-[#6B7A99] font-600">{idx + 1}</td>
                        <td className="px-5 py-3.5">
                          {result.rank > 0 ? (
                            <span
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-700 ${
                                result.rank === 1
                                  ? 'bg-amber-50 text-amber-600'
                                  : result.rank === 2
                                    ? 'bg-gray-100 text-gray-600'
                                    : result.rank === 3
                                      ? 'bg-orange-50 text-orange-600'
                                      : 'bg-[#F4F6FA] text-[#6B7A99]'
                              }`}
                            >
                              {result.rank}
                            </span>
                          ) : (
                            <span className="text-[#DDE3EE] text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-600 text-sm text-[#0D1B3E]">{result.name}</p>
                            <p className="text-xs text-[#6B7A99]">{result.email || '—'}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-[#F4F6FA] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct >= 70 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="font-700 text-sm text-[#0D1B3E]">
                              {pct > 0 ? `${pct}%` : '—'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#3D5A80]">
                          {result.mcqScore > 0 ? result.mcqScore : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#3D5A80]">
                          {result.codingScore > 0 ? result.codingScore : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#3D5A80]">
                          {result.subjectiveScore > 0 ? result.subjectiveScore : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-sm text-[#3D5A80]">
                          {result.timeTaken > 0 ? `${result.timeTaken}m` : '—'}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`text-[10px] font-600 px-2 py-1 rounded-full border ${statusColors[result.status]}`}
                          >
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
        </>
      )}
    </div>
  );
}
