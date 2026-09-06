'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, AlertCircle, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, AreaChart, Area, Legend } from 'recharts';
import { createClient } from '@/lib/supabase/client';

interface TeamMember {
  id: string;
  email: string;
  full_name: string;
  role: string;
  subscription_status: string;
  plan_name: string;
  credits_used: number;
  credits_total: number;
  renewal_date: string | null;
  price_inr: number;
  created_at?: string;
  last_active?: string;
}

interface FailedPayment {
  id: string;
  user_id: string;
  original_order_id: string;
  retry_attempt: number;
  next_retry_at: string | null;
  last_error: string | null;
  status: string;
  created_at: string;
}

const PLAN_COLORS: Record<string, string> = {
  free: '#94A3B8',
  starter: '#3B82F6',
  growth: '#8B5CF6',
  pro: '#F59E0B',
  recruiter_starter: '#10B981',
  recruiter_pro: '#0D9488',
  business: '#EC4899',
};

// LTV multipliers per plan (months avg retention)
const PLAN_LTV_MONTHS: Record<string, number> = {
  free: 0,
  starter: 8,
  growth: 14,
  pro: 20,
  recruiter_starter: 12,
  recruiter_pro: 18,
  business: 24,
};

function fmtINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Generate MRR forecast data (6 months ahead)
function buildMRRForecast(currentMRR: number) {
  const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
  const growthRate = 0.08; // 8% MoM
  const churnRate = 0.03;  // 3% churn
  return months.map((month, i) => {
    const net = currentMRR * Math.pow(1 + growthRate - churnRate, i + 1);
    const optimistic = currentMRR * Math.pow(1 + growthRate * 1.5 - churnRate * 0.5, i + 1);
    const pessimistic = currentMRR * Math.pow(1 + growthRate * 0.5 - churnRate * 1.5, i + 1);
    return {
      month,
      base: Math.round(net),
      optimistic: Math.round(optimistic),
      pessimistic: Math.round(pessimistic),
    };
  });
}

// Cohort retention mock data
const cohortData = [
  { cohort: 'Jul 2026', m0: 100, m1: 82, m2: 71, m3: 65, m4: 60, m5: 57 },
  { cohort: 'Aug 2026', m0: 100, m1: 85, m2: 74, m3: 68, m4: 63, m5: null },
  { cohort: 'Sep 2026', m0: 100, m1: 88, m2: 77, m3: null, m4: null, m5: null },
];

function churnRiskLevel(m: TeamMember): 'high' | 'medium' | 'low' {
  const creditPct = m.credits_total > 0 ? m.credits_used / m.credits_total : 0;
  const daysToRenewal = m.renewal_date
    ? Math.ceil((new Date(m.renewal_date).getTime() - Date.now()) / 86400000)
    : 999;
  if (m.subscription_status === 'past_due') return 'high';
  if (creditPct < 0.1 && daysToRenewal < 30) return 'high';
  if (creditPct < 0.3 || daysToRenewal < 14) return 'medium';
  return 'low';
}

export default function TeamSubscriptionContent() {
  const supabase = createClient();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'forecast' | 'churn' | 'cohort' | 'ltv' | 'members' | 'failed'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*, user_profiles:user_id(id, email, full_name, role)')
        .order('created_at', { ascending: false });

      if (subs) {
        const mapped: TeamMember[] = subs.map((s: any) => ({
          id: s.user_id,
          email: s.user_profiles?.email || '—',
          full_name: s.user_profiles?.full_name || '—',
          role: s.user_profiles?.role || 'candidate',
          subscription_status: s.status,
          plan_name: s.plan_name || s.plan_id,
          credits_used: s.credits_used || 0,
          credits_total: s.credits_total || 0,
          renewal_date: s.renewal_date,
          price_inr: s.price_inr || 0,
          created_at: s.created_at,
        }));
        setMembers(mapped);
      }

      const { data: retries } = await supabase
        .from('payment_retry_log')
        .select('*')
        .in('status', ['pending', 'failed'])
        .order('created_at', { ascending: false })
        .limit(20);

      if (retries) setFailedPayments(retries);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Computed metrics
  const totalMRR = members.reduce((s, m) => s + (m.subscription_status === 'active' ? m.price_inr : 0), 0);
  const activeCount = members.filter(m => m.subscription_status === 'active').length;
  const totalCreditsConsumed = members.reduce((s, m) => s + m.credits_used, 0);
  const failedCount = failedPayments.length;

  // Churn risk
  const highRisk = members.filter(m => churnRiskLevel(m) === 'high');
  const mediumRisk = members.filter(m => churnRiskLevel(m) === 'medium');

  // Plan distribution
  const planDist: Record<string, number> = {};
  members.forEach(m => { planDist[m.plan_name] = (planDist[m.plan_name] || 0) + 1; });
  const planChartData = Object.entries(planDist).map(([plan, count]) => ({ plan, count }));

  // LTV per plan
  const ltvData = Object.entries(planDist).map(([plan, count]) => {
    const planMembers = members.filter(m => m.plan_name === plan && m.subscription_status === 'active');
    const avgPrice = planMembers.length > 0 ? planMembers.reduce((s, m) => s + m.price_inr, 0) / planMembers.length : 0;
    const ltv = Math.round(avgPrice * (PLAN_LTV_MONTHS[plan] || 10));
    return { plan: plan.replace(/_/g, ' '), count, avgPrice: Math.round(avgPrice), ltv, months: PLAN_LTV_MONTHS[plan] || 10 };
  }).filter(d => d.avgPrice > 0).sort((a, b) => b.ltv - a.ltv);

  // MRR forecast
  const mrrForecast = buildMRRForecast(totalMRR || 45000);

  // Top credit consumers
  const topConsumers = [...members].sort((a, b) => b.credits_used - a.credits_used).slice(0, 5);

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'forecast', label: 'MRR Forecast' },
    { id: 'churn', label: `Churn Risk${highRisk.length > 0 ? ` (${highRisk.length})` : ''}` },
    { id: 'cohort', label: 'Cohort Retention' },
    { id: 'ltv', label: 'LTV per Plan' },
    { id: 'members', label: `Members (${members.length})` },
    { id: 'failed', label: `Failed Payments${failedCount > 0 ? ` (${failedCount})` : ''}` },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users size={24} className="text-primary" />
            Team Subscription Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">MRR forecast, churn risk, cohort retention, LTV, and payment health</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Monthly Recurring Revenue', value: fmtINR(totalMRR), icon: <TrendingUp size={18} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20', sub: `${activeCount} active seats` },
          { label: 'Active Subscriptions', value: activeCount, icon: <CheckCircle2 size={18} className="text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20', sub: `of ${members.length} total` },
          { label: 'Churn Risk', value: `${highRisk.length} high / ${mediumRisk.length} med`, icon: <AlertCircle size={18} className="text-red-500" />, bg: highRisk.length > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900/20', sub: 'accounts at risk' },
          { label: 'Failed Payments', value: failedCount, icon: <AlertCircle size={18} className="text-amber-500" />, bg: failedCount > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-slate-50 dark:bg-slate-900/20', sub: 'requiring attention' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-background rounded-lg">{card.icon}</div>
            </div>
            <div className="text-xl font-bold text-foreground">{loading ? '—' : card.value}</div>
            <div className="text-xs font-medium text-muted-foreground mt-0.5">{card.label}</div>
            <div className="text-xs text-muted-foreground">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-sm rounded-lg font-medium transition-all ${
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Plan Distribution</h3>
                {planChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={planChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="plan" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {planChartData.map((entry, i) => (
                          <Cell key={i} fill={PLAN_COLORS[entry.plan] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Top Credit Consumers</h3>
                <div className="space-y-3">
                  {topConsumers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">No data available</p>
                  ) : (
                    topConsumers.map((m, i) => {
                      const pct = m.credits_total > 0 ? Math.round((m.credits_used / m.credits_total) * 100) : 0;
                      return (
                        <div key={m.id} className="flex items-center gap-3">
                          <span className="text-xs font-bold text-muted-foreground w-5">#{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-foreground truncate">{m.full_name || m.email}</span>
                              <span className="text-xs text-muted-foreground ml-2">{m.credits_used}/{m.credits_total}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full">
                              <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#0D9488' }} />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-foreground">{pct}%</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-foreground mb-4">MRR per Seat Breakdown</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Seats</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">Price/Seat</th>
                        <th className="text-right px-4 py-2.5 text-xs font-medium text-muted-foreground">MRR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(planDist).map(([plan, count]) => {
                        const planMembers = members.filter(m => m.plan_name === plan && m.subscription_status === 'active');
                        const planMRR = planMembers.reduce((s, m) => s + m.price_inr, 0);
                        const pricePerSeat = planMembers.length > 0 ? Math.round(planMRR / planMembers.length) : 0;
                        return (
                          <tr key={plan} className="border-t border-border hover:bg-accent/20 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[plan] || '#0D9488' }} />
                                <span className="font-medium capitalize">{plan.replace(/_/g, ' ')}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{count}</td>
                            <td className="px-4 py-3 text-right text-muted-foreground">{fmtINR(pricePerSeat)}</td>
                            <td className="px-4 py-3 text-right font-semibold text-foreground">{fmtINR(planMRR)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="px-4 py-3 font-semibold text-foreground" colSpan={3}>Total MRR</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmtINR(totalMRR)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* MRR Forecast Tab */}
          {activeTab === 'forecast' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Current MRR', value: fmtINR(totalMRR || 45000), sub: 'Sep 2026', color: 'text-foreground' },
                  { label: '3-Month Forecast (Base)', value: fmtINR(mrrForecast[2]?.base || 0), sub: 'Dec 2026', color: 'text-blue-600' },
                  { label: '6-Month Forecast (Base)', value: fmtINR(mrrForecast[5]?.base || 0), sub: 'Mar 2027', color: 'text-emerald-600' },
                ].map(c => (
                  <div key={c.label} className="bg-card border border-border rounded-xl p-5">
                    <p className="text-xs text-muted-foreground mb-1">{c.sub}</p>
                    <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
                  </div>
                ))}
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-foreground">6-Month MRR Forecast</h3>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> Optimistic (+12% MoM)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-blue-500 inline-block" /> Base (+5% MoM)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> Pessimistic (+2% MoM)</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={mrrForecast}>
                    <defs>
                      <linearGradient id="optGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="baseGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} />
                    <Tooltip
                      contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => fmtINR(v)}
                    />
                    <Area type="monotone" dataKey="optimistic" stroke="#10B981" fill="url(#optGrad)" strokeWidth={2} name="Optimistic" />
                    <Area type="monotone" dataKey="base" stroke="#3B82F6" fill="url(#baseGrad)" strokeWidth={2.5} name="Base" />
                    <Line type="monotone" dataKey="pessimistic" stroke="#F59E0B" strokeWidth={2} strokeDasharray="4 2" dot={false} name="Pessimistic" />
                  </AreaChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-3">Forecast assumes 8% MoM growth (base), 3% monthly churn. Optimistic: 12% growth / 1.5% churn. Pessimistic: 4% growth / 4.5% churn.</p>
              </div>
            </div>
          )}

          {/* Churn Risk Tab */}
          {activeTab === 'churn' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'High Risk', count: highRisk.length, color: 'bg-red-50 border-red-200 dark:bg-red-900/20', text: 'text-red-600', desc: 'Past due or very low usage' },
                  { label: 'Medium Risk', count: mediumRisk.length, color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20', text: 'text-amber-600', desc: 'Low usage or renewal soon' },
                  { label: 'Low Risk', count: members.length - highRisk.length - mediumRisk.length, color: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20', text: 'text-emerald-600', desc: 'Healthy engagement' },
                ].map(c => (
                  <div key={c.label} className={`${c.color} border rounded-xl p-4`}>
                    <p className={`text-3xl font-bold ${c.text}`}>{c.count}</p>
                    <p className="text-sm font-semibold text-foreground mt-1">{c.label}</p>
                    <p className="text-xs text-muted-foreground">{c.desc}</p>
                  </div>
                ))}
              </div>

              {highRisk.length > 0 && (
                <div className="bg-card border border-red-200 dark:border-red-900/40 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-red-50 dark:bg-red-900/20 flex items-center gap-2">
                    <AlertCircle size={14} className="text-red-600" />
                    <span className="text-sm font-semibold text-red-700 dark:text-red-400">High Churn Risk — Immediate Action Required</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Member</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credit Usage</th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Renewal</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Risk Reason</th>
                        </tr>
                      </thead>
                      <tbody>
                        {highRisk.map(m => {
                          const pct = m.credits_total > 0 ? Math.round((m.credits_used / m.credits_total) * 100) : 0;
                          const reason = m.subscription_status === 'past_due' ? 'Payment past due' : pct < 10 ? 'Very low credit usage' : 'Renewal within 14 days';
                          return (
                            <tr key={m.id} className="border-t border-border hover:bg-accent/20">
                              <td className="px-5 py-3"><div><p className="font-medium">{m.full_name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div></td>
                              <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{m.plan_name?.replace(/_/g, ' ')}</span></td>
                              <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 capitalize font-medium">{m.subscription_status}</span></td>
                              <td className="px-5 py-3 text-right text-xs">{m.credits_used}/{m.credits_total} ({pct}%)</td>
                              <td className="px-5 py-3 text-right text-xs text-muted-foreground">{fmtDate(m.renewal_date)}</td>
                              <td className="px-5 py-3 text-xs text-red-600">{reason}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mediumRisk.length > 0 && (
                <div className="bg-card border border-amber-200 dark:border-amber-900/40 rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-amber-50 dark:bg-amber-900/20 flex items-center gap-2">
                    <AlertCircle size={14} className="text-amber-600" />
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400">Medium Churn Risk — Monitor Closely</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Member</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credit Usage</th>
                          <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Renewal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mediumRisk.map(m => {
                          const pct = m.credits_total > 0 ? Math.round((m.credits_used / m.credits_total) * 100) : 0;
                          return (
                            <tr key={m.id} className="border-t border-border hover:bg-accent/20">
                              <td className="px-5 py-3"><div><p className="font-medium">{m.full_name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div></td>
                              <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{m.plan_name?.replace(/_/g, ' ')}</span></td>
                              <td className="px-5 py-3 text-right text-xs">{m.credits_used}/{m.credits_total} ({pct}%)</td>
                              <td className="px-5 py-3 text-right text-xs text-muted-foreground">{fmtDate(m.renewal_date)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {highRisk.length === 0 && mediumRisk.length === 0 && (
                <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16">
                  <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
                  <p className="font-medium text-foreground">No churn risk detected</p>
                  <p className="text-sm text-muted-foreground mt-1">All subscriptions are healthy</p>
                </div>
              )}
            </div>
          )}

          {/* Cohort Retention Tab */}
          {activeTab === 'cohort' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Cohort Retention Curves</h3>
                <p className="text-xs text-muted-foreground mb-4">% of subscribers still active N months after joining</p>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" type="category" allowDuplicatedCategory={false} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" label={{ value: 'Months since join', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => `${v}%`} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    {cohortData.map((cohort, ci) => {
                      const data = [
                        { month: 'M0', value: cohort.m0 },
                        { month: 'M1', value: cohort.m1 },
                        { month: 'M2', value: cohort.m2 },
                        ...(cohort.m3 !== null ? [{ month: 'M3', value: cohort.m3 }] : []),
                        ...(cohort.m4 !== null ? [{ month: 'M4', value: cohort.m4 }] : []),
                        ...(cohort.m5 !== null ? [{ month: 'M5', value: cohort.m5 }] : []),
                      ];
                      const colors = ['#0D9488', '#3B82F6', '#8B5CF6'];
                      return (
                        <Line
                          key={cohort.cohort}
                          data={data}
                          type="monotone"
                          dataKey="value"
                          stroke={colors[ci]}
                          strokeWidth={2.5}
                          dot={{ r: 4 }}
                          name={cohort.cohort}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-foreground">Cohort Retention Table</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Cohort</th>
                        {['M0', 'M1', 'M2', 'M3', 'M4', 'M5'].map(m => (
                          <th key={m} className="text-center px-4 py-3 text-xs font-medium text-muted-foreground">{m}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {cohortData.map(c => (
                        <tr key={c.cohort} className="border-t border-border">
                          <td className="px-5 py-3 font-medium text-foreground">{c.cohort}</td>
                          {[c.m0, c.m1, c.m2, c.m3, c.m4, c.m5].map((v, i) => (
                            <td key={i} className="px-4 py-3 text-center">
                              {v !== null ? (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  v >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                  v >= 60 ? 'bg-blue-100 text-blue-700' :
                                  v >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                }`}>{v}%</span>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* LTV per Plan Tab */}
          {activeTab === 'ltv' && (
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-1">Lifetime Value per Plan</h3>
                <p className="text-xs text-muted-foreground mb-4">LTV = Avg Monthly Price × Avg Retention Months</p>
                {ltvData.length === 0 ? (
                  <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No active subscriptions with pricing data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={ltvData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="plan" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" tickFormatter={v => '₹' + (v / 1000).toFixed(0) + 'k'} />
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v: number) => fmtINR(v)}
                      />
                      <Bar dataKey="ltv" radius={[4, 4, 0, 0]} name="LTV (₹)">
                        {ltvData.map((entry, i) => (
                          <Cell key={i} fill={PLAN_COLORS[entry.plan.replace(/ /g, '_')] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Active Seats</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Avg Price/Mo</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Avg Retention</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">LTV</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Total LTV Pool</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ltvData.map(d => (
                        <tr key={d.plan} className="border-t border-border hover:bg-accent/20 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: PLAN_COLORS[d.plan.replace(/ /g, '_')] || '#0D9488' }} />
                              <span className="font-medium capitalize">{d.plan}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-right text-muted-foreground">{d.count}</td>
                          <td className="px-5 py-3 text-right text-muted-foreground">{fmtINR(d.avgPrice)}</td>
                          <td className="px-5 py-3 text-right text-muted-foreground">{d.months} mo</td>
                          <td className="px-5 py-3 text-right font-bold text-foreground">{fmtINR(d.ltv)}</td>
                          <td className="px-5 py-3 text-right font-semibold text-emerald-600">{fmtINR(d.ltv * d.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-border bg-muted/20">
                        <td className="px-5 py-3 font-semibold text-foreground" colSpan={5}>Total LTV Pool</td>
                        <td className="px-5 py-3 text-right font-bold text-emerald-600">{fmtINR(ltvData.reduce((s, d) => s + d.ltv * d.count, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/30">
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Member</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Plan</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Churn Risk</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">MRR</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Renewal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-12 text-muted-foreground">No members found</td></tr>
                    ) : (
                      members.map(m => {
                        const pct = m.credits_total > 0 ? Math.round((m.credits_used / m.credits_total) * 100) : 0;
                        const risk = churnRiskLevel(m);
                        return (
                          <tr key={m.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-3"><div><p className="font-medium text-foreground">{m.full_name}</p><p className="text-xs text-muted-foreground">{m.email}</p></div></td>
                            <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{m.plan_name?.replace(/_/g, ' ')}</span></td>
                            <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${m.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' : m.subscription_status === 'past_due' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{m.subscription_status}</span></td>
                            <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${risk === 'high' ? 'bg-red-100 text-red-700' : risk === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{risk}</span></td>
                            <td className="px-5 py-3 text-right"><div className="flex flex-col items-end gap-1"><span className="text-xs font-medium">{m.credits_used}/{m.credits_total}</span><div className="w-16 h-1.5 bg-muted rounded-full"><div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#0D9488' }} /></div></div></td>
                            <td className="px-5 py-3 text-right font-medium text-foreground">{fmtINR(m.price_inr)}</td>
                            <td className="px-5 py-3 text-right text-muted-foreground text-xs">{fmtDate(m.renewal_date)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Payments Tab */}
          {activeTab === 'failed' && (
            <div className="space-y-4">
              {failedPayments.length === 0 ? (
                <div className="bg-card border border-border rounded-xl flex flex-col items-center justify-center py-16">
                  <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
                  <p className="text-foreground font-medium">No failed payments</p>
                  <p className="text-sm text-muted-foreground mt-1">All payments are processing normally</p>
                </div>
              ) : (
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  <div className="p-4 border-b border-border bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle size={16} />
                      <span className="text-sm font-medium">{failedPayments.length} payment(s) require attention</span>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/30">
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Order ID</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Retry #</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Error</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Next Retry</th>
                          <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {failedPayments.map(fp => (
                          <tr key={fp.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-muted-foreground">{fp.original_order_id || '—'}</td>
                            <td className="px-5 py-3"><span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Attempt {fp.retry_attempt}</span></td>
                            <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">{fp.last_error || '—'}</td>
                            <td className="px-5 py-3 text-xs text-muted-foreground">{fmtDate(fp.next_retry_at)}</td>
                            <td className="px-5 py-3"><span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${fp.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{fp.status}</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
