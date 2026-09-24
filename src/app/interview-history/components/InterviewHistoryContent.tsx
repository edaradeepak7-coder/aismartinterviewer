'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus, Calendar, Star, BarChart2, Filter, ArrowUpDown, Clock, AlertCircle, Award, ThumbsUp, ThumbsDown, Loader2, RefreshCw, MessageSquare, Target, Zap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { candidateService } from '@/lib/services/interviewService';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryInterview {
  id: string;
  role: string;
  company: string;
  interview_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number | null;
  overall_score: number | null;
  technical_score: number | null;
  communication_score: number | null;
  role_alignment_score: number | null;
  recommendation: string | null;
  ai_feedback_generated: boolean;
  result?: {
    final_score: number | null;
    ai_summary: string | null;
    strengths: string[];
    improvements: string[];
    competencies: any[];
    ai_feedback: any[];
  } | null;
}

type SortField = 'date' | 'role' | 'score';
type SortDir = 'asc' | 'desc';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const scoreColor = (s: number | null) => {
  if (s === null) return 'text-muted-foreground';
  if (s >= 85) return 'text-emerald-400';
  if (s >= 70) return 'text-blue-400';
  if (s >= 55) return 'text-amber-400';
  return 'text-red-400';
};

const scoreBg = (s: number | null) => {
  if (s === null) return 'bg-muted';
  if (s >= 85) return 'bg-emerald-400';
  if (s >= 70) return 'bg-blue-400';
  if (s >= 55) return 'bg-amber-400';
  return 'bg-red-400';
};

const recConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  strong_yes: { label: 'Strong Hire', color: 'text-emerald-400', icon: <Award size={12} /> },
  yes: { label: 'Hire', color: 'text-blue-400', icon: <ThumbsUp size={12} /> },
  maybe: { label: 'Consider', color: 'text-amber-400', icon: <AlertCircle size={12} /> },
  no: { label: 'Decline', color: 'text-red-400', icon: <ThumbsDown size={12} /> },
};

const statusConfig: Record<string, { label: string; color: string }> = {
  completed: { label: 'Completed', color: 'text-emerald-400' },
  evaluated: { label: 'Evaluated', color: 'text-blue-400' },
  in_progress: { label: 'In Progress', color: 'text-amber-400' },
  scheduled: { label: 'Scheduled', color: 'text-muted-foreground' },
  archived: { label: 'Archived', color: 'text-muted-foreground' },
};

// ─── Score Trend Chart ────────────────────────────────────────────────────────

function ScoreTrendChart({ interviews }: { interviews: HistoryInterview[] }) {
  const data = useMemo(() => {
    return [...interviews]
      .filter(i => i.overall_score !== null)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())
      .map((i, idx) => ({
        idx: idx + 1,
        score: i.overall_score!,
        role: i.role,
        date: new Date(i.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }));
  }, [interviews]);

  if (data.length < 2) return null;

  const avg = Math.round(data.reduce((s, d) => s + d.score, 0) / data.length);
  const first = data[0].score;
  const last = data[data.length - 1].score;
  const trend = last - first;

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-600 text-foreground">Score Trend</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{data.length} scored interviews</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className={`text-lg font-700 tabular-nums ${scoreColor(avg)}`}>{avg}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Trend</p>
            <div className={`flex items-center gap-1 text-sm font-600 ${trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
              {trend > 0 ? '+' : ''}{trend}
            </div>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} axisLine={false} tickLine={false} />
          <ReferenceLine y={avg} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
          <Tooltip
            contentStyle={{ background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: 'var(--color-muted-foreground)' }}
            formatter={(v: any, _: any, props: any) => [`${v} — ${props.payload?.role}`, 'Score']}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={{ fill: '#60a5fa', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#93c5fd' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Expandable Interview Card ────────────────────────────────────────────────

function InterviewCard({ interview }: { interview: HistoryInterview }) {
  const [expanded, setExpanded] = useState(false);
  const score = interview.result?.final_score ?? interview.overall_score;
  const rec = interview.recommendation;
  const recCfg = rec ? recConfig[rec] : null;
  const statusCfg = statusConfig[interview.status] || { label: interview.status, color: 'text-muted-foreground' };

  const competencies = interview.result?.competencies || [];
  const strengths: string[] = interview.result?.strengths || [];
  const improvements: string[] = interview.result?.improvements || [];
  const aiSummary = interview.result?.ai_summary;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden transition-all duration-200 hover:border-border/80">
      {/* Card Header — always visible */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full text-left px-5 py-4 flex items-center gap-4"
        aria-expanded={expanded}
      >
        {/* Score ring */}
        <div className="shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center"
          style={{ borderColor: score !== null ? (score >= 85 ? '#34d399' : score >= 70 ? '#60a5fa' : score >= 55 ? '#fbbf24' : '#f87171') : 'var(--color-border)' }}>
          <span className={`text-sm font-700 tabular-nums ${scoreColor(score)}`}>
            {score !== null ? score : '—'}
          </span>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-600 text-foreground truncate">{interview.role}</span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{interview.company}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar size={11} />
              {new Date(interview.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {interview.duration_minutes && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {interview.duration_minutes}m
              </span>
            )}
            <span className={`text-xs font-500 capitalize ${statusCfg.color}`}>{statusCfg.label}</span>
            {recCfg && (
              <span className={`flex items-center gap-1 text-xs font-500 ${recCfg.color}`}>
                {recCfg.icon}
                {recCfg.label}
              </span>
            )}
          </div>
        </div>

        {/* Score bars (mini) */}
        <div className="hidden sm:flex flex-col gap-1 w-28 shrink-0">
          {[
            { label: 'Tech', val: interview.technical_score },
            { label: 'Comm', val: interview.communication_score },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground w-8 shrink-0">{label}</span>
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${scoreBg(val)}`} style={{ width: `${val ?? 0}%` }} />
              </div>
              <span className={`text-[10px] font-600 tabular-nums w-6 text-right ${scoreColor(val)}`}>{val ?? '—'}</span>
            </div>
          ))}
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-muted-foreground ml-2">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4 bg-background/30">
          {/* All score bars */}
          {[
            { label: 'Technical', val: interview.technical_score },
            { label: 'Communication', val: interview.communication_score },
            { label: 'Role Alignment', val: interview.role_alignment_score },
          ].map(({ label, val }) => (
            <div key={label} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${scoreBg(val)}`} style={{ width: `${val ?? 0}%` }} />
              </div>
              <span className={`text-xs font-700 tabular-nums w-8 text-right ${scoreColor(val)}`}>{val ?? '—'}</span>
            </div>
          ))}

          {/* Competencies from result */}
          {competencies.length > 0 && (
            <div>
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-2">Competencies</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {competencies.map((c: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
                    <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${scoreBg(c.score)}`} />
                    <span className="text-xs text-foreground flex-1 truncate">{c.name}</span>
                    <span className={`text-xs font-700 tabular-nums ${scoreColor(c.score)}`}>{c.score}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {aiSummary && (
            <div className="bg-muted/20 rounded-lg p-3 border border-border/50">
              <p className="text-xs font-600 text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MessageSquare size={11} /> AI Summary
              </p>
              <p className="text-xs text-foreground leading-relaxed">{aiSummary}</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          {(strengths.length > 0 || improvements.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {strengths.length > 0 && (
                <div>
                  <p className="text-xs font-600 text-emerald-400 mb-1.5 flex items-center gap-1">
                    <Target size={11} /> Strengths
                  </p>
                  <ul className="space-y-1">
                    {strengths.slice(0, 3).map((s: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {improvements.length > 0 && (
                <div>
                  <p className="text-xs font-600 text-amber-400 mb-1.5 flex items-center gap-1">
                    <Zap size={11} /> To Improve
                  </p>
                  <ul className="space-y-1">
                    {improvements.slice(0, 3).map((s: string, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end pt-1">
            <Link
              href="/interview-results"
              className="text-xs text-primary hover:underline font-500"
            >
              View full results →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InterviewHistoryContent() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<HistoryInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const candidate = await candidateService.getByUserId(user.id);

      let query = supabase
        .from('interviews')
        .select(`
          id, role, company, interview_type, status, scheduled_at,
          duration_minutes, overall_score, technical_score, communication_score,
          role_alignment_score, recommendation, ai_feedback_generated,
          interview_results(final_score, ai_summary, strengths, improvements, competencies, ai_feedback)
        `)
        .order('scheduled_at', { ascending: false });

      if (candidate) {
        query = query.eq('candidate_id', candidate.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped: HistoryInterview[] = (data || []).map((row: any) => ({
        ...row,
        result: Array.isArray(row.interview_results) ? row.interview_results[0] ?? null : row.interview_results ?? null,
      }));
      setInterviews(mapped);
    } catch (err) {
      console.error('Failed to load interview history:', err);
    } finally {
      setLoading(false);
    }
  };

  const roles = useMemo(() => Array.from(new Set(interviews.map(i => i.role))).sort(), [interviews]);

  const sorted = useMemo(() => {
    let list = [...interviews];
    if (filterRole) list = list.filter(i => i.role === filterRole);
    if (filterStatus) list = list.filter(i => i.status === filterStatus);

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'date') cmp = new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
      else if (sortField === 'role') cmp = a.role.localeCompare(b.role);
      else if (sortField === 'score') cmp = (a.overall_score ?? -1) - (b.overall_score ?? -1);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [interviews, sortField, sortDir, filterRole, filterStatus]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortBtn = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => toggleSort(field)}
      className={`flex items-center gap-1 text-xs font-500 px-3 py-1.5 rounded-lg border transition-colors ${
        sortField === field
          ? 'bg-primary/15 border-primary/30 text-primary' :'border-border text-muted-foreground hover:text-foreground hover:border-border/80'
      }`}
    >
      {label}
      <ArrowUpDown size={11} className={sortField === field ? 'text-primary' : ''} />
      {sortField === field && (
        <span className="text-[10px]">{sortDir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  );

  // Summary stats
  const scored = interviews.filter(i => i.overall_score !== null);
  const avgScore = scored.length ? Math.round(scored.reduce((s, i) => s + i.overall_score!, 0) / scored.length) : null;
  const bestScore = scored.length ? Math.max(...scored.map(i => i.overall_score!)) : null;

  return (
    <div className="space-y-6 fade-in">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#E8F4F8] flex items-center justify-center shrink-0">
            <BarChart2 size={20} className="text-[#0D9488]" />
          </div>
          <div>
            <h1 className="text-2xl font-800 text-[#0D1B3E]">Interview History</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">Review your past interviews, scores, and AI feedback</p>
          </div>
        </div>

        {/* Stat pills */}
        <div className="hidden sm:flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <BarChart2 size={16} className="text-[#0D9488]" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">{interviews.length}</p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-[#E8ECF4] rounded-xl px-4 py-2.5 shadow-sm">
            <Star size={16} className="text-amber-400" />
            <div>
              <p className="text-base font-800 text-[#0D1B3E] leading-none">
                {interviews.filter(i => i.overall_score !== null).length > 0
                  ? Math.round(interviews.filter(i => i.overall_score !== null).reduce((s, i) => s + (i.overall_score || 0), 0) / interviews.filter(i => i.overall_score !== null).length)
                  : '—'}
              </p>
              <p className="text-[10px] text-[#6B7A99] mt-0.5">Avg Score</p>
            </div>
          </div>
          <button
            onClick={loadHistory}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-500 text-[#6B7A99] border border-[#E8ECF4] rounded-xl hover:bg-[#F4F6FA] transition-colors bg-white"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tab Nav */}
      <div className="flex gap-0 border-b border-[#E8ECF4]">
        {['All', 'Completed', 'In Progress', 'Scheduled'].map((label, i) => (
          <button
            key={label}
            className={[
              'px-5 py-3 text-sm font-600 border-b-2 transition-all duration-150 -mb-px',
              i === 0
                ? 'border-[#0D9488] text-[#0D9488]'
                : 'border-transparent text-[#6B7A99] hover:text-[#0D1B3E]',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Trend Chart */}
      {!loading && <ScoreTrendChart interviews={interviews} />}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-1">
          <Filter size={12} /> Sort by:
        </div>
        <SortBtn field="date" label="Date" />
        <SortBtn field="role" label="Role" />
        <SortBtn field="score" label="Score" />

        <div className="ml-auto flex items-center gap-2">
          {roles.length > 1 && (
            <select
              value={filterRole}
              onChange={e => setFilterRole(e.target.value)}
              className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="">All Roles</option>
              {roles.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs bg-card border border-border rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
          >
            <option value="">All Status</option>
            <option value="completed">Completed</option>
            <option value="evaluated">Evaluated</option>
            <option value="scheduled">Scheduled</option>
          </select>
          <button
            onClick={loadHistory}
            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors"
            title="Refresh"
          >
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <BarChart2 size={36} className="text-muted-foreground/40 mb-3" />
          <p className="text-sm font-500 text-foreground">No interviews found</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filterRole || filterStatus ? 'Try adjusting your filters' : 'Complete your first interview to see history here'}
          </p>
          {!filterRole && !filterStatus && (
            <Link href="/interview-setup" className="mt-4 text-xs text-primary hover:underline font-500">
              Start an interview →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map(interview => (
            <InterviewCard key={interview.id} interview={interview} />
          ))}
        </div>
      )}
    </div>
  );
}
