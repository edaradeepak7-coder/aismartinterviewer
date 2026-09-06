'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, Zap, DollarSign, BarChart2, RefreshCw, Loader2, Award, Target, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, ReferenceLine
} from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface SessionROI {
  session_id: string;
  date: string;
  topic: string;
  credits_spent: number;
  score: number;
  cost_per_point: number;
  roi_score: number;
}

interface ROISummary {
  totalCreditsSpent: number;
  totalSessions: number;
  avgScore: number;
  avgROIScore: number;
  costPerSession: number;
  costPerPoint: number;
  trend: 'up' | 'down' | 'flat';
  trendPct: number;
}

// Mock data representing per-interview credit spend vs performance
const mockSessions: SessionROI[] = [
  { session_id: 's1', date: '2026-07-05', topic: 'Data Structures', credits_spent: 10, score: 62, cost_per_point: 0.16, roi_score: 62 },
  { session_id: 's2', date: '2026-07-12', topic: 'System Design', credits_spent: 15, score: 58, cost_per_point: 0.26, roi_score: 39 },
  { session_id: 's3', date: '2026-07-19', topic: 'Behavioral', credits_spent: 8, score: 74, cost_per_point: 0.11, roi_score: 93 },
  { session_id: 's4', date: '2026-07-26', topic: 'Data Structures', credits_spent: 10, score: 78, cost_per_point: 0.13, roi_score: 78 },
  { session_id: 's5', date: '2026-08-02', topic: 'System Design', credits_spent: 15, score: 71, cost_per_point: 0.21, roi_score: 47 },
  { session_id: 's6', date: '2026-08-09', topic: 'SQL & Databases', credits_spent: 12, score: 83, cost_per_point: 0.14, roi_score: 69 },
  { session_id: 's7', date: '2026-08-16', topic: 'Behavioral', credits_spent: 8, score: 88, cost_per_point: 0.09, roi_score: 110 },
  { session_id: 's8', date: '2026-08-23', topic: 'Data Structures', credits_spent: 10, score: 85, cost_per_point: 0.12, roi_score: 85 },
  { session_id: 's9', date: '2026-08-30', topic: 'System Design', credits_spent: 15, score: 79, cost_per_point: 0.19, roi_score: 53 },
  { session_id: 's10', date: '2026-09-06', topic: 'SQL & Databases', credits_spent: 12, score: 91, cost_per_point: 0.13, roi_score: 76 },
];

const trendChartData = mockSessions.map(s => ({
  date: new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
  score: s.score,
  credits: s.credits_spent,
  roi: s.roi_score,
}));

const topicData = (() => {
  const map: Record<string, { total_credits: number; total_score: number; count: number }> = {};
  mockSessions.forEach(s => {
    if (!map[s.topic]) map[s.topic] = { total_credits: 0, total_score: 0, count: 0 };
    map[s.topic].total_credits += s.credits_spent;
    map[s.topic].total_score += s.score;
    map[s.topic].count += 1;
  });
  return Object.entries(map).map(([topic, d]) => ({
    topic,
    avg_score: Math.round(d.total_score / d.count),
    total_credits: d.total_credits,
    roi: Math.round((d.total_score / d.count) / (d.total_credits / d.count) * 10),
  }));
})();

function ROIBadge({ score }: { score: number }) {
  if (score >= 80) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Excellent</span>;
  if (score >= 60) return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Good</span>;
  if (score >= 40) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Fair</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Poor</span>;
}

export default function CreditROIContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<SessionROI[]>(mockSessions);
  const [summary, setSummary] = useState<ROISummary>({
    totalCreditsSpent: 115,
    totalSessions: 10,
    avgScore: 76.9,
    avgROIScore: 71.2,
    costPerSession: 11.5,
    costPerPoint: 0.15,
    trend: 'up',
    trendPct: 14.7,
  });
  const [activeView, setActiveView] = useState<'trend' | 'topic' | 'sessions'>('trend');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: interviews } = await supabase
          .from('interviews')
          .select('id, created_at, topic, overall_score, credits_used')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(50);

        if (interviews && interviews.length > 0) {
          const mapped: SessionROI[] = interviews.map((iv: any) => {
            const credits = iv.credits_used || 10;
            const score = iv.overall_score || 0;
            const cpp = score > 0 ? parseFloat((credits / score).toFixed(2)) : 0;
            const roi = score > 0 ? Math.round((score / credits) * 10) : 0;
            return {
              session_id: iv.id,
              date: iv.created_at,
              topic: iv.topic || 'General',
              credits_spent: credits,
              score,
              cost_per_point: cpp,
              roi_score: roi,
            };
          });
          setSessions(mapped);

          const totalCredits = mapped.reduce((s, m) => s + m.credits_spent, 0);
          const avgScore = mapped.reduce((s, m) => s + m.score, 0) / mapped.length;
          const avgROI = mapped.reduce((s, m) => s + m.roi_score, 0) / mapped.length;
          const recent = mapped.slice(-3);
          const older = mapped.slice(-6, -3);
          const recentAvg = recent.reduce((s, m) => s + m.score, 0) / (recent.length || 1);
          const olderAvg = older.reduce((s, m) => s + m.score, 0) / (older.length || 1);
          const trendPct = olderAvg > 0 ? parseFloat(((recentAvg - olderAvg) / olderAvg * 100).toFixed(1)) : 0;

          setSummary({
            totalCreditsSpent: totalCredits,
            totalSessions: mapped.length,
            avgScore: parseFloat(avgScore.toFixed(1)),
            avgROIScore: parseFloat(avgROI.toFixed(1)),
            costPerSession: parseFloat((totalCredits / mapped.length).toFixed(1)),
            costPerPoint: parseFloat((totalCredits / (avgScore * mapped.length)).toFixed(2)),
            trend: trendPct > 2 ? 'up' : trendPct < -2 ? 'down' : 'flat',
            trendPct: Math.abs(trendPct),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const TrendIcon = summary.trend === 'up' ? ArrowUp : summary.trend === 'down' ? ArrowDown : Minus;
  const trendColor = summary.trend === 'up' ? 'text-emerald-500' : summary.trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  const VIEWS = [
    { id: 'trend', label: 'Performance Trend' },
    { id: 'topic', label: 'By Topic' },
    { id: 'sessions', label: 'Session Log' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 size={24} className="text-primary" />
            Credit ROI Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Track cost per session, performance vs spend, and ROI score</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Credits Spent', value: summary.totalCreditsSpent, icon: <Zap size={16} className="text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Sessions', value: summary.totalSessions, icon: <Target size={16} className="text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Avg Score', value: `${summary.avgScore}%`, icon: <Award size={16} className="text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'ROI Score', value: summary.avgROIScore.toFixed(0), icon: <TrendingUp size={16} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Cost/Session', value: `${summary.costPerSession} cr`, icon: <DollarSign size={16} className="text-rose-500" />, bg: 'bg-rose-50 dark:bg-rose-900/20' },
          { label: 'Cost/Point', value: `${summary.costPerPoint} cr`, icon: <BarChart2 size={16} className="text-cyan-500" />, bg: 'bg-cyan-50 dark:bg-cyan-900/20' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
            <div className="p-1.5 bg-background rounded-lg w-fit mb-2">{card.icon}</div>
            <div className="text-xl font-bold text-foreground">{loading ? '—' : card.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Trend Banner */}
      <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${
        summary.trend === 'up' ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20' :
        summary.trend === 'down'? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-muted/30 border-border'
      }`}>
        <TrendIcon size={18} className={trendColor} />
        <p className="text-sm font-medium text-foreground">
          {summary.trend === 'up'
            ? `Your performance improved ${summary.trendPct}% in recent sessions — your credits are working harder.`
            : summary.trend === 'down'
            ? `Performance dipped ${summary.trendPct}% recently. Consider focusing on weaker topics.`
            : 'Performance is stable. Try harder topics to push your ROI score higher.'}
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {VIEWS.map(v => (
          <button
            key={v.id}
            onClick={() => setActiveView(v.id)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              activeView === v.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Performance Trend Chart */}
          {activeView === 'trend' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Score vs Credits Spent Over Time</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={[0, 100]} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="left" type="monotone" dataKey="score" stroke="#0D9488" strokeWidth={2} dot={{ r: 3 }} name="Score %" />
                    <Line yAxisId="right" type="monotone" dataKey="credits" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" name="Credits" />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">ROI Score Trend</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={trendChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 2" label={{ value: 'Good ROI', fontSize: 10, fill: '#F59E0B' }} />
                    <Line type="monotone" dataKey="roi" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} name="ROI Score" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* By Topic */}
          {activeView === 'topic' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Avg Score by Topic</h3>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={topicData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={[0, 100]} />
                    <YAxis dataKey="topic" type="category" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={110} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="avg_score" fill="#0D9488" radius={[0, 4, 4, 0]} name="Avg Score %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">ROI Score by Topic</h3>
                <div className="space-y-4">
                  {topicData.sort((a, b) => b.roi - a.roi).map(t => (
                    <div key={t.topic}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-foreground">{t.topic}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{t.total_credits} cr spent</span>
                          <ROIBadge score={t.roi} />
                          <span className="text-sm font-bold text-foreground w-8 text-right">{t.roi}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(t.roi, 100)}%`,
                            background: t.roi >= 80 ? '#10B981' : t.roi >= 60 ? '#3B82F6' : t.roi >= 40 ? '#F59E0B' : '#EF4444',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Session Log */}
          {activeView === 'sessions' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Topic</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Score</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Cost/Point</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">ROI Score</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s.session_id} className="border-t border-border hover:bg-accent/20 transition-colors">
                        <td className="px-5 py-3 text-muted-foreground text-xs">{new Date(s.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="px-5 py-3 font-medium text-foreground">{s.topic}</td>
                        <td className="px-5 py-3 text-right text-violet-600 font-medium">{s.credits_spent}</td>
                        <td className="px-5 py-3 text-right">
                          <span className={`font-semibold ${s.score >= 80 ? 'text-emerald-600' : s.score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                            {s.score}%
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-muted-foreground text-xs">{s.cost_per_point} cr</td>
                        <td className="px-5 py-3 text-right font-bold text-foreground">{s.roi_score}</td>
                        <td className="px-5 py-3 text-right"><ROIBadge score={s.roi_score} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
