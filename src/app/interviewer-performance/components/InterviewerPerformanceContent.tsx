'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Star, MessageSquare, Target, Users, TrendingUp, Calendar, Award, Mic,
  ThumbsUp, ArrowUp, ArrowDown, Minus, Loader2, RefreshCw,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface InterviewerMetric {
  id: string;
  name: string;
  avatar: string;
  role: string;
  totalInterviews: number;
  avgCandidateScore: number;
  questionEffectiveness: number;
  candidateExperience: number;
  interviewQuality: number;
  completionRate: number;
  avgDuration: number;
  trend: 'up' | 'down' | 'flat';
  trendValue: number;
  radar: { metric: string; score: number }[];
}

interface FeedbackEntry {
  id: string;
  interviewer: string;
  candidate: string;
  role: string;
  date: string;
  candidateImpression: number;
  questionClarity: number;
  technicalAccuracy: number;
  overallExperience: number;
  notes: string;
  decision?: string | null;
  status: 'completed' | 'pending';
}

interface PerfPayload {
  interviewers: InterviewerMetric[];
  feedback: FeedbackEntry[];
  qualityTrend: { month: string; quality: number; experience: number; effectiveness: number }[];
  kpis: {
    avgQuality: number;
    avgExperience: number;
    avgEffectiveness: number;
    totalInterviews: number;
    scoreDelta: number;
  };
  empty: boolean;
}

function MetricBadge({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`text-lg font-800 ${color}`}>{value}%</div>
      <div className="text-[10px] text-[#6B7A99] mt-0.5">{label}</div>
    </div>
  );
}

function StarDisplay({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= value ? 'text-amber-400 fill-amber-400' : 'text-[#E8ECF4]'} />
      ))}
    </div>
  );
}

function TrendChip({ delta }: { delta: number }) {
  if (delta > 0.5) {
    return (
      <span className="text-xs font-600 text-emerald-600 flex items-center gap-0.5">
        <ArrowUp size={10} />+{delta}%
      </span>
    );
  }
  if (delta < -0.5) {
    return (
      <span className="text-xs font-600 text-red-500 flex items-center gap-0.5">
        <ArrowDown size={10} />{delta}%
      </span>
    );
  }
  return (
    <span className="text-xs font-600 text-[#6B7A99] flex items-center gap-0.5">
      <Minus size={10} />0%
    </span>
  );
}

export default function InterviewerPerformanceContent() {
  const [activeTab, setActiveTab] = useState<'overview' | 'feedback' | 'trends'>('overview');
  const [selectedInterviewer, setSelectedInterviewer] = useState<InterviewerMetric | null>(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<PerfPayload>({
    interviewers: [],
    feedback: [],
    qualityTrend: [],
    kpis: { avgQuality: 0, avgExperience: 0, avgEffectiveness: 0, totalInterviews: 0, scoreDelta: 0 },
    empty: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/interviewer-performance?range=${timeRange}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Failed to load');
      const payload = json.data as PerfPayload;
      setData(payload);
      setSelectedInterviewer((prev) => {
        if (!payload.interviewers.length) return null;
        if (prev && payload.interviewers.some((i) => i.id === prev.id)) {
          return payload.interviewers.find((i) => i.id === prev.id) || payload.interviewers[0];
        }
        return payload.interviewers[0];
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load');
      setData({
        interviewers: [],
        feedback: [],
        qualityTrend: [],
        kpis: { avgQuality: 0, avgExperience: 0, avgEffectiveness: 0, totalInterviews: 0, scoreDelta: 0 },
        empty: true,
      });
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    load();
  }, [load]);

  const TABS = [
    { id: 'overview' as const, label: 'Interviewer Overview', icon: <Users size={14} /> },
    { id: 'feedback' as const, label: 'Feedback Collection', icon: <MessageSquare size={14} /> },
    { id: 'trends' as const, label: 'Quality Trends', icon: <TrendingUp size={14} /> },
  ];

  const radarData = selectedInterviewer?.radar || [];
  const delta = data.kpis.scoreDelta;

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
            <Award size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E] dark:text-white">Interviewer Performance</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              Track panel effectiveness from real interviews and structured feedback
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-xs border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-lg px-3 py-2 bg-white dark:bg-[#162447] text-[#0D1B3E] dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 border border-[#E8ECF4] rounded-lg text-sm font-600 text-[#6B7A99] hover:bg-[#F4F6FA] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            href="/recruiter-structured-feedback"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg text-sm font-600 transition-colors"
          >
            <MessageSquare size={14} /> Collect Feedback
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {!loading && !error && data.empty && (
        <div className="rounded-xl border border-dashed border-[#E8ECF4] bg-white px-6 py-10 text-center">
          <Users size={28} className="text-[#D1D9E6] mx-auto mb-2" />
          <p className="text-sm font-600 text-[#0D1B3E]">No interviewer activity in this range</p>
          <p className="text-xs text-[#6B7A99] mt-1">
            Schedule interviews or submit structured feedback to populate this view.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 stagger-children">
        {[
          {
            label: 'Avg Interview Quality',
            value: loading ? '—' : `${data.kpis.avgQuality}%`,
            icon: <Award size={18} />,
            color: 'text-violet-600',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
          },
          {
            label: 'Candidate Experience',
            value: loading ? '—' : `${data.kpis.avgExperience}%`,
            icon: <ThumbsUp size={18} />,
            color: 'text-teal-600',
            bg: 'bg-teal-50 dark:bg-teal-900/20',
          },
          {
            label: 'Question Effectiveness',
            value: loading ? '—' : `${data.kpis.avgEffectiveness}%`,
            icon: <Target size={18} />,
            color: 'text-blue-600',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
          {
            label: 'Total Interviews',
            value: loading ? '—' : data.kpis.totalInterviews.toLocaleString(),
            icon: <Mic size={18} />,
            color: 'text-amber-600',
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
        ].map((kpi, i) => (
          <div
            key={i}
            className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-4 card-hover fade-in-up"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                <span className={kpi.color}>{kpi.icon}</span>
              </div>
              {!loading && <TrendChip delta={delta} />}
            </div>
            <p className="text-2xl font-800 text-[#0D1B3E] dark:text-white">{kpi.value}</p>
            <p className="text-xs text-[#6B7A99] mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-0 border-b border-[#E8ECF4] dark:border-[#1E3A5F]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-600 border-b-2 transition-all -mb-px ${
              activeTab === tab.id
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E] dark:hover:text-white'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-[#6B7A99] gap-2 text-sm">
          <Loader2 size={18} className="animate-spin" /> Loading performance data…
        </div>
      )}

      {!loading && activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="space-y-3">
            <h3 className="text-sm font-700 text-[#0D1B3E] dark:text-white">Interviewers</h3>
            {data.interviewers.length === 0 && (
              <p className="text-xs text-[#6B7A99]">No recruiters with interviews in this range.</p>
            )}
            {data.interviewers.map((iv) => (
              <div
                key={iv.id}
                onClick={() => setSelectedInterviewer(iv)}
                className={`bg-white dark:bg-[#162447] border rounded-xl p-4 cursor-pointer hover:shadow-sm transition-all card-hover ${
                  selectedInterviewer?.id === iv.id
                    ? 'border-violet-400 ring-1 ring-violet-400/30'
                    : 'border-[#E8ECF4] dark:border-[#1E3A5F]'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-700 text-white shrink-0">
                    {iv.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-700 text-[#0D1B3E] dark:text-white truncate">{iv.name}</p>
                    <p className="text-xs text-[#6B7A99] truncate">{iv.role}</p>
                  </div>
                  <div
                    className={`flex items-center gap-0.5 text-xs font-600 ${
                      iv.trend === 'up'
                        ? 'text-emerald-600'
                        : iv.trend === 'down'
                          ? 'text-red-500'
                          : 'text-[#6B7A99]'
                    }`}
                  >
                    {iv.trend === 'up' ? (
                      <ArrowUp size={11} />
                    ) : iv.trend === 'down' ? (
                      <ArrowDown size={11} />
                    ) : (
                      <Minus size={11} />
                    )}
                    {Math.abs(iv.trendValue)}%
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MetricBadge value={iv.interviewQuality} label="Quality" color="text-violet-600" />
                  <MetricBadge value={iv.candidateExperience} label="Experience" color="text-teal-600" />
                  <MetricBadge value={iv.questionEffectiveness} label="Effectiveness" color="text-blue-600" />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#9BA8C0]">
                  <span>{iv.totalInterviews} interviews</span>
                  <span>{iv.completionRate}% completion</span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-2 space-y-4">
            {selectedInterviewer ? (
              <>
                <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
                  <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-700 text-white">
                      {selectedInterviewer.avatar}
                    </div>
                    <div>
                      <h3 className="text-base font-800 text-[#0D1B3E] dark:text-white">
                        {selectedInterviewer.name}
                      </h3>
                      <p className="text-sm text-[#6B7A99]">
                        {selectedInterviewer.role} · {selectedInterviewer.totalInterviews} interviews
                        {selectedInterviewer.avgDuration
                          ? ` · ~${selectedInterviewer.avgDuration} min avg`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Interview Quality', value: selectedInterviewer.interviewQuality, color: 'bg-violet-500' },
                      { label: 'Candidate Experience', value: selectedInterviewer.candidateExperience, color: 'bg-teal-500' },
                      { label: 'Question Effectiveness', value: selectedInterviewer.questionEffectiveness, color: 'bg-blue-500' },
                      { label: 'Completion Rate', value: selectedInterviewer.completionRate, color: 'bg-emerald-500' },
                    ].map((m, i) => (
                      <div key={i} className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-xl p-3">
                        <p className="text-xs text-[#6B7A99] mb-1">{m.label}</p>
                        <p className="text-xl font-800 text-[#0D1B3E] dark:text-white">{m.value}%</p>
                        <div className="h-1.5 bg-[#E8ECF4] dark:bg-[#1E3A5F] rounded-full mt-2 overflow-hidden">
                          <div className={`h-full ${m.color} rounded-full`} style={{ width: `${Math.min(100, m.value)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
                  <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Performance Radar</h4>
                  {radarData.some((r) => r.score > 0) ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="#E8ECF4" />
                        <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#6B7A99' }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9BA8C0' }} />
                        <Radar name="Score" dataKey="score" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-xs text-[#6B7A99] py-8 text-center">Not enough scored interviews yet.</p>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-white dark:bg-[#162447] border-2 border-dashed border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-12 text-center">
                <Users size={32} className="text-[#D1D9E6] mx-auto mb-3" />
                <p className="text-sm text-[#6B7A99]">Select an interviewer to view detailed performance metrics</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && activeTab === 'feedback' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-700 text-[#0D1B3E] dark:text-white">Structured Feedback Records</h3>
            <Link
              href="/recruiter-structured-feedback"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#0D9488] hover:bg-[#0B8076] text-white rounded-lg text-xs font-600 transition-colors"
            >
              <MessageSquare size={13} /> New Feedback
            </Link>
          </div>
          {data.feedback.length === 0 && (
            <p className="text-sm text-[#6B7A99] py-8 text-center">
              No structured feedback yet.{' '}
              <Link href="/recruiter-structured-feedback" className="text-[#0D9488] font-600">
                Submit feedback →
              </Link>
            </p>
          )}
          <div className="space-y-3">
            {data.feedback.map((fb) => (
              <div
                key={fb.id}
                className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-4 card-hover"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div>
                    <p className="font-700 text-[#0D1B3E] dark:text-white text-sm">{fb.candidate}</p>
                    <p className="text-xs text-[#6B7A99]">
                      {fb.role} · Interviewed by {fb.interviewer}
                    </p>
                    <p className="text-xs text-[#9BA8C0] mt-0.5 flex items-center gap-1">
                      <Calendar size={10} />
                      {fb.date}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-xs font-600 rounded-full shrink-0 capitalize">
                    {fb.decision || 'completed'}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                  {[
                    { label: 'Candidate Impression', value: fb.candidateImpression },
                    { label: 'Question Clarity', value: fb.questionClarity },
                    { label: 'Technical Accuracy', value: fb.technicalAccuracy },
                    { label: 'Overall Experience', value: fb.overallExperience },
                  ].map((m, i) => (
                    <div key={i} className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-lg p-2.5">
                      <p className="text-[10px] text-[#6B7A99] mb-1">{m.label}</p>
                      <StarDisplay value={m.value} />
                    </div>
                  ))}
                </div>
                {fb.notes && (
                  <div className="bg-[#F8FAFC] dark:bg-[#0D1B3E] rounded-lg p-3">
                    <p className="text-xs text-[#6B7A99] leading-relaxed">{fb.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && activeTab === 'trends' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
            <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Quality Metrics Over Time</h4>
            {data.qualityTrend.length === 0 ? (
              <p className="text-xs text-[#6B7A99] py-10 text-center">Not enough scored interviews for a trend.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.qualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="quality" stroke="#8B5CF6" strokeWidth={2} dot={false} name="Interview Quality" />
                  <Line type="monotone" dataKey="experience" stroke="#0D9488" strokeWidth={2} dot={false} name="Candidate Experience" />
                  <Line type="monotone" dataKey="effectiveness" stroke="#3B82F6" strokeWidth={2} dot={false} name="Question Effectiveness" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white dark:bg-[#162447] border border-[#E8ECF4] dark:border-[#1E3A5F] rounded-xl p-5">
            <h4 className="text-sm font-700 text-[#0D1B3E] dark:text-white mb-4">Interviewer Comparison</h4>
            {data.interviewers.length === 0 ? (
              <p className="text-xs text-[#6B7A99] py-10 text-center">No interviewers to compare.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={data.interviewers.map((iv) => ({
                    name: iv.name.split(' ')[0],
                    quality: iv.interviewQuality,
                    experience: iv.candidateExperience,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F2F7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9BA8C0' }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E8ECF4' }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="quality" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="Quality" />
                  <Bar dataKey="experience" fill="#0D9488" radius={[4, 4, 0, 0]} name="Experience" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
