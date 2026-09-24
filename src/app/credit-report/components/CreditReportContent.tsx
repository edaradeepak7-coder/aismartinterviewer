'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart2, TrendingUp, Clock, Zap, Calendar, Loader2, RefreshCw, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface FeatureUsage {
  feature: string;
  credits_used: number;
  count: number;
}

interface HourlyUsage {
  hour: number;
  credits: number;
}

interface MonthlyTrend {
  month: string;
  credits: number;
}

const FEATURE_COLORS: Record<string, string> = {
  mock_interview: '#0D9488',
  voice_interview: '#3B82F6',
  assessment: '#8B5CF6',
  lsrw: '#F59E0B',
  ats_check: '#10B981',
  ai_coaching: '#EC4899',
  company_pack: '#F97316',
  other: '#94A3B8',
};

const FEATURE_LABELS: Record<string, string> = {
  mock_interview: 'Mock Interview',
  voice_interview: 'Voice Interview',
  assessment: 'Assessment',
  lsrw: 'LSRW Skills',
  ats_check: 'ATS Check',
  ai_coaching: 'AI Coaching',
  company_pack: 'Company Pack',
  other: 'Other',
};

function TrendBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return <span className="text-xs text-muted-foreground">—</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return (
    <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
      <ArrowUp size={12} /> {pct}%
    </span>
  );
  if (pct < 0) return (
    <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
      <ArrowDown size={12} /> {Math.abs(pct)}%
    </span>
  );
  return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus size={12} /> 0%</span>;
}

export default function CreditReportContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const [featureUsage, setFeatureUsage] = useState<FeatureUsage[]>([]);
  const [hourlyUsage, setHourlyUsage] = useState<HourlyUsage[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [totalCredits, setTotalCredits] = useState(0);
  const [prevMonthCredits, setPrevMonthCredits] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[selectedPeriod] || 30;
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const prevSince = new Date(Date.now() - days * 2 * 86400000).toISOString();

      // Feature usage
      const { data: usage } = await supabase
        .from('credit_usage')
        .select('feature, credits_used')
        .eq('user_id', user.id)
        .gte('created_at', since);

      if (usage) {
        const grouped: Record<string, FeatureUsage> = {};
        usage.forEach(u => {
          const key = u.feature || 'other';
          if (!grouped[key]) grouped[key] = { feature: key, credits_used: 0, count: 0 };
          grouped[key].credits_used += u.credits_used;
          grouped[key].count += 1;
        });
        const sorted = Object.values(grouped).sort((a, b) => b.credits_used - a.credits_used);
        setFeatureUsage(sorted);
        setTotalCredits(sorted.reduce((s, f) => s + f.credits_used, 0));
      }

      // Previous period total
      const { data: prevUsage } = await supabase
        .from('credit_usage')
        .select('credits_used')
        .eq('user_id', user.id)
        .gte('created_at', prevSince)
        .lt('created_at', since);
      if (prevUsage) {
        setPrevMonthCredits(prevUsage.reduce((s, u) => s + u.credits_used, 0));
      }

      // Hourly usage (peak hours)
      const { data: hourly } = await supabase
        .from('credit_usage')
        .select('hour_of_day, credits_used')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .not('hour_of_day', 'is', null);

      if (hourly && hourly.length > 0) {
        const byHour: Record<number, number> = {};
        for (let h = 0; h < 24; h++) byHour[h] = 0;
        hourly.forEach(u => {
          if (u.hour_of_day !== null) byHour[u.hour_of_day] = (byHour[u.hour_of_day] || 0) + u.credits_used;
        });
        setHourlyUsage(Object.entries(byHour).map(([h, c]) => ({ hour: parseInt(h), credits: c })));
      } else {
        setHourlyUsage(Array.from({ length: 24 }, (_, h) => ({ hour: h, credits: 0 })));
      }

      // Monthly trend (last 6 months)
      const months: MonthlyTrend[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString();
        const { data: mData } = await supabase
          .from('credit_usage')
          .select('credits_used')
          .eq('user_id', user.id)
          .gte('created_at', start)
          .lte('created_at', end);
        months.push({ month: label, credits: mData?.reduce((s, u) => s + u.credits_used, 0) || 0 });
      }
      setMonthlyTrend(months);
    } finally {
      setLoading(false);
    }
  }, [user?.id, selectedPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const peakHour = hourlyUsage.reduce((max, h) => h.credits > max.credits ? h : max, { hour: 0, credits: 0 });
  const peakLabel = `${peakHour.hour}:00–${peakHour.hour + 1}:00`;

  const pieData = featureUsage.slice(0, 6).map(f => ({
    name: FEATURE_LABELS[f.feature] || f.feature,
    value: f.credits_used,
    color: FEATURE_COLORS[f.feature] || '#94A3B8',
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart2 size={24} className="text-primary" />
            Credit Usage Report
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed breakdown of credit consumption by feature</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={e => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 text-sm bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={fetchData} className="p-2 border border-border rounded-lg hover:bg-accent transition-colors">
            <RefreshCw size={16} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Credits Used',
            value: totalCredits,
            icon: <Zap size={18} className="text-primary" />,
            trend: <TrendBadge current={totalCredits} previous={prevMonthCredits} />,
            bg: 'bg-primary/5',
          },
          {
            label: 'Top Feature',
            value: featureUsage[0] ? (FEATURE_LABELS[featureUsage[0].feature] || featureUsage[0].feature) : '—',
            icon: <TrendingUp size={18} className="text-violet-500" />,
            trend: featureUsage[0] ? <span className="text-xs text-muted-foreground">{featureUsage[0].credits_used} cr</span> : null,
            bg: 'bg-violet-50 dark:bg-violet-900/20',
          },
          {
            label: 'Peak Usage Hour',
            value: peakHour.credits > 0 ? peakLabel : '—',
            icon: <Clock size={18} className="text-amber-500" />,
            trend: peakHour.credits > 0 ? <span className="text-xs text-muted-foreground">{peakHour.credits} cr</span> : null,
            bg: 'bg-amber-50 dark:bg-amber-900/20',
          },
          {
            label: 'Sessions This Period',
            value: featureUsage.reduce((s, f) => s + f.count, 0),
            icon: <Calendar size={18} className="text-blue-500" />,
            trend: null,
            bg: 'bg-blue-50 dark:bg-blue-900/20',
          },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-background rounded-lg">{card.icon}</div>
              {card.trend}
            </div>
            <div className="text-xl font-bold text-foreground">{loading ? '—' : card.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{card.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Feature Breakdown Bar Chart */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Credits by Feature</h3>
            {featureUsage.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No usage data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={featureUsage.slice(0, 7)} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                  <YAxis
                    type="category"
                    dataKey="feature"
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                    tickFormatter={v => FEATURE_LABELS[v] || v}
                    width={90}
                  />
                  <Tooltip
                    formatter={(v: number) => [`${v} credits`, 'Used']}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="credits_used" radius={[0, 4, 4, 0]}>
                    {featureUsage.slice(0, 7).map((entry, i) => (
                      <Cell key={i} fill={FEATURE_COLORS[entry.feature] || '#94A3B8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Feature Distribution Pie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4">Usage Distribution</h3>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">No usage data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v: number) => [`${v} credits`, '']}
                    contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Peak Usage Hours */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Peak Usage Hours</h3>
            <p className="text-xs text-muted-foreground mb-4">Credit consumption by hour of day</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={hourlyUsage} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  tickFormatter={h => `${h}h`}
                  interval={3}
                />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => [`${v} credits`, 'Used']}
                  labelFormatter={h => `${h}:00–${parseInt(h as string) + 1}:00`}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Bar dataKey="credits" fill="#3B82F6" radius={[2, 2, 0, 0]}>
                  {hourlyUsage.map((entry, i) => (
                    <Cell key={i} fill={entry.hour === peakHour.hour ? '#0D9488' : '#3B82F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Month-over-Month Trend */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground mb-1">Month-over-Month Trend</h3>
            <p className="text-xs text-muted-foreground mb-4">Credit consumption over the last 6 months</p>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={monthlyTrend} margin={{ left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <Tooltip
                  formatter={(v: number) => [`${v} credits`, 'Used']}
                  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
                <Line
                  type="monotone"
                  dataKey="credits"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ fill: '#8B5CF6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Feature Table */}
      {!loading && featureUsage.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-5 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Feature Usage Breakdown</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Feature</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Sessions</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits Used</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Avg/Session</th>
                  <th className="px-5 py-3 text-xs font-medium text-muted-foreground">Share</th>
                </tr>
              </thead>
              <tbody>
                {featureUsage.map((f, i) => {
                  const pct = totalCredits > 0 ? Math.round((f.credits_used / totalCredits) * 100) : 0;
                  return (
                    <tr key={f.feature} className="border-t border-border hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: FEATURE_COLORS[f.feature] || '#94A3B8' }} />
                          <span className="font-medium text-foreground">{FEATURE_LABELS[f.feature] || f.feature}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{f.count}</td>
                      <td className="px-5 py-3 text-right font-semibold text-foreground">{f.credits_used}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">
                        {f.count > 0 ? Math.round(f.credits_used / f.count) : 0}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-1.5">
                            <div
                              className="h-1.5 rounded-full"
                              style={{ width: `${pct}%`, background: FEATURE_COLORS[f.feature] || '#94A3B8' }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
