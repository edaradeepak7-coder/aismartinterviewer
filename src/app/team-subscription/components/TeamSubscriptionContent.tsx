'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Users, TrendingUp, AlertCircle, Zap, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
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

function fmtINR(amount: number) {
  return '₹' + amount.toLocaleString('en-IN');
}

function fmtDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TeamSubscriptionContent() {
  const supabase = createClient();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'failed'>('overview');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch subscriptions with user profiles
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
        }));
        setMembers(mapped);
      }

      // Fetch failed payments
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

  // Top credit consumers
  const topConsumers = [...members].sort((a, b) => b.credits_used - a.credits_used).slice(0, 5);

  // Plan distribution
  const planDist: Record<string, number> = {};
  members.forEach(m => {
    planDist[m.plan_name] = (planDist[m.plan_name] || 0) + 1;
  });
  const planChartData = Object.entries(planDist).map(([plan, count]) => ({ plan, count }));

  const TABS = [
    { id: 'overview', label: 'Overview' },
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
          <p className="text-sm text-muted-foreground mt-1">Monitor team subscriptions, credits, and payment health</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          {
            label: 'Monthly Recurring Revenue',
            value: fmtINR(totalMRR),
            icon: <TrendingUp size={18} className="text-emerald-500" />,
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
            sub: `${activeCount} active seats`,
          },
          {
            label: 'Active Subscriptions',
            value: activeCount,
            icon: <CheckCircle2 size={18} className="text-blue-500" />,
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            sub: `of ${members.length} total`,
          },
          {
            label: 'Total Credits Consumed',
            value: totalCreditsConsumed.toLocaleString(),
            icon: <Zap size={18} className="text-violet-500" />,
            bg: 'bg-violet-50 dark:bg-violet-900/20',
            sub: 'this billing cycle',
          },
          {
            label: 'Failed Payments',
            value: failedCount,
            icon: <AlertCircle size={18} className="text-red-500" />,
            bg: failedCount > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900/20',
            sub: 'requiring attention',
          },
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
      <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
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
              {/* Plan Distribution */}
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
                      <Tooltip
                        contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {planChartData.map((entry, i) => (
                          <Cell key={i} fill={PLAN_COLORS[entry.plan] || '#0D9488'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Top Credit Consumers */}
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
                              <div
                                className="h-1.5 rounded-full"
                                style={{
                                  width: `${pct}%`,
                                  background: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#0D9488',
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-xs font-semibold text-foreground">{pct}%</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* MRR per Seat */}
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
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">MRR</th>
                      <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Renewal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12 text-muted-foreground">No members found</td>
                      </tr>
                    ) : (
                      members.map(m => {
                        const pct = m.credits_total > 0 ? Math.round((m.credits_used / m.credits_total) * 100) : 0;
                        return (
                          <tr key={m.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                            <td className="px-5 py-3">
                              <div>
                                <p className="font-medium text-foreground">{m.full_name}</p>
                                <p className="text-xs text-muted-foreground">{m.email}</p>
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">
                                {m.plan_name?.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-5 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                                m.subscription_status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                m.subscription_status === 'past_due'? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {m.subscription_status}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="text-xs font-medium">{m.credits_used}/{m.credits_total}</span>
                                <div className="w-16 h-1.5 bg-muted rounded-full">
                                  <div
                                    className="h-1.5 rounded-full"
                                    style={{
                                      width: `${pct}%`,
                                      background: pct > 90 ? '#EF4444' : pct > 70 ? '#F59E0B' : '#0D9488',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
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
                            <td className="px-5 py-3">
                              <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                                Attempt {fp.retry_attempt}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground max-w-[200px] truncate">
                              {fp.last_error || '—'}
                            </td>
                            <td className="px-5 py-3 text-xs text-muted-foreground">{fmtDate(fp.next_retry_at)}</td>
                            <td className="px-5 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                                fp.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {fp.status}
                              </span>
                            </td>
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
