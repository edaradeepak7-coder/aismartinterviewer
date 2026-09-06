'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Copy, Check, Users, TrendingUp, Zap, Share2, RefreshCw, Loader2, Award, DollarSign, BarChart2, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface ReferralStats {
  referralCode: string;
  totalReferrals: number;
  pendingReferrals: number;
  completedReferrals: number;
  creditsEarned: number;
  creditsAvailable: number;
  conversionRate: number;
}

interface ReferralEntry {
  id: string;
  referred_email: string;
  status: 'pending' | 'signed_up' | 'subscribed';
  credits_awarded: number;
  created_at: string;
}

// Admin view data
interface AdminReferralMetric {
  referrer_email: string;
  referral_code: string;
  total_referrals: number;
  converted: number;
  credits_awarded: number;
  acquisition_cost_inr: number;
  conversion_rate: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  signed_up: 'bg-blue-100 text-blue-700',
  subscribed: 'bg-emerald-100 text-emerald-700',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtINR(n: number) {
  return '₹' + n.toLocaleString('en-IN');
}

// Mock admin data for acquisition cost tracking
const mockAdminMetrics: AdminReferralMetric[] = [
  { referrer_email: 'priya.sharma@example.com', referral_code: 'PRIYA2024', total_referrals: 12, converted: 8, credits_awarded: 800, acquisition_cost_inr: 312, conversion_rate: 66.7 },
  { referrer_email: 'arjun.mehta@example.com', referral_code: 'ARJUN2024', total_referrals: 9, converted: 5, credits_awarded: 500, acquisition_cost_inr: 450, conversion_rate: 55.6 },
  { referrer_email: 'kavya.nair@example.com', referral_code: 'KAVYA2024', total_referrals: 7, converted: 6, credits_awarded: 600, acquisition_cost_inr: 275, conversion_rate: 85.7 },
  { referrer_email: 'rohit.verma@example.com', referral_code: 'ROHIT2024', total_referrals: 5, converted: 2, credits_awarded: 200, acquisition_cost_inr: 625, conversion_rate: 40.0 },
  { referrer_email: 'sneha.patel@example.com', referral_code: 'SNEHA2024', total_referrals: 15, converted: 11, credits_awarded: 1100, acquisition_cost_inr: 227, conversion_rate: 73.3 },
];

const mockReferralEntries: ReferralEntry[] = [
  { id: '1', referred_email: 'friend1@example.com', status: 'subscribed', credits_awarded: 100, created_at: '2026-08-15T10:00:00Z' },
  { id: '2', referred_email: 'friend2@example.com', status: 'signed_up', credits_awarded: 50, created_at: '2026-08-22T14:30:00Z' },
  { id: '3', referred_email: 'friend3@example.com', status: 'pending', credits_awarded: 0, created_at: '2026-09-01T09:15:00Z' },
  { id: '4', referred_email: 'friend4@example.com', status: 'subscribed', credits_awarded: 100, created_at: '2026-09-03T16:45:00Z' },
];

export default function ReferralContent() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-referrals' | 'admin'>('my-referrals');
  const [stats, setStats] = useState<ReferralStats>({
    referralCode: 'SMART2024',
    totalReferrals: 4,
    pendingReferrals: 1,
    completedReferrals: 2,
    creditsEarned: 250,
    creditsAvailable: 150,
    conversionRate: 50,
  });
  const [referrals, setReferrals] = useState<ReferralEntry[]>(mockReferralEntries);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminMetrics, setAdminMetrics] = useState<AdminReferralMetric[]>(mockAdminMetrics);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, full_name')
          .eq('id', user.id)
          .single();
        if (profile?.role === 'admin') setIsAdmin(true);

        // Generate deterministic referral code from user id
        const code = 'SMART' + user.id.slice(0, 6).toUpperCase();
        setStats(prev => ({ ...prev, referralCode: code }));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const referralLink = `https://aismartint3906.builtwithrocket.new/register?ref=${stats.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: 'Join AI Smart Interviewer', text: 'Use my referral code to get bonus credits!', url: referralLink });
    } else {
      handleCopy();
    }
  };

  const TABS = [
    { id: 'my-referrals', label: 'My Referrals' },
    ...(isAdmin ? [{ id: 'admin', label: 'Admin: Acquisition Cost' }] : []),
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Gift size={24} className="text-primary" />
            Referral Program
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Share your code, earn credits for every friend who joins</p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin text-primary' : 'text-muted-foreground'} />
          Refresh
        </button>
      </div>

      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-6">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">Your Referral Code</p>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl font-bold tracking-widest text-foreground font-mono">{stats.referralCode}</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-xs text-muted-foreground break-all">{referralLink}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium hover:bg-accent transition-colors"
            >
              <Share2 size={16} className="text-primary" />
              Share Link
            </button>
          </div>
        </div>

        {/* How it works */}
        <div className="mt-5 pt-5 border-t border-primary/10 grid grid-cols-3 gap-4">
          {[
            { step: '1', label: 'Share your code', desc: 'Send to friends via link or code' },
            { step: '2', label: 'Friend signs up', desc: 'They register using your code' },
            { step: '3', label: 'Earn 100 credits', desc: 'When they subscribe to any plan' },
          ].map(s => (
            <div key={s.step} className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shrink-0">{s.step}</div>
              <div>
                <p className="text-sm font-semibold text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Referrals', value: stats.totalReferrals, icon: <Users size={18} className="text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-900/20' },
          { label: 'Converted', value: stats.completedReferrals, icon: <Award size={18} className="text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
          { label: 'Credits Earned', value: stats.creditsEarned, icon: <Zap size={18} className="text-violet-500" />, bg: 'bg-violet-50 dark:bg-violet-900/20' },
          { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: <TrendingUp size={18} className="text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-900/20' },
        ].map(card => (
          <div key={card.label} className={`${card.bg} border border-border rounded-xl p-4`}>
            <div className="p-2 bg-background rounded-lg w-fit mb-2">{card.icon}</div>
            <div className="text-2xl font-bold text-foreground">{loading ? '—' : card.value}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      {isAdmin && (
        <div className="flex gap-1 bg-muted/30 p-1 rounded-xl w-fit">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
                activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* My Referrals Tab */}
      {activeTab === 'my-referrals' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">Referral History</h3>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={28} className="animate-spin text-primary" />
            </div>
          ) : referrals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Gift size={36} className="mb-3 opacity-40" />
              <p className="font-medium">No referrals yet</p>
              <p className="text-sm mt-1">Share your code to start earning credits</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Friend Email</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits Awarded</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map(r => (
                    <tr key={r.id} className="border-t border-border hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{r.referred_email}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[r.status]}`}>
                          {r.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        {r.credits_awarded > 0 ? (
                          <span className="text-emerald-600 font-semibold">+{r.credits_awarded}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground text-xs">{fmtDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Admin Tab */}
      {activeTab === 'admin' && isAdmin && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Referrers', value: adminMetrics.length, icon: <Users size={16} className="text-blue-500" /> },
              { label: 'Avg Acquisition Cost', value: fmtINR(Math.round(adminMetrics.reduce((s, m) => s + m.acquisition_cost_inr, 0) / adminMetrics.length)), icon: <DollarSign size={16} className="text-amber-500" /> },
              { label: 'Total Credits Issued', value: adminMetrics.reduce((s, m) => s + m.credits_awarded, 0), icon: <Zap size={16} className="text-violet-500" /> },
              { label: 'Avg Conversion Rate', value: `${(adminMetrics.reduce((s, m) => s + m.conversion_rate, 0) / adminMetrics.length).toFixed(1)}%`, icon: <BarChart2 size={16} className="text-emerald-500" /> },
            ].map(card => (
              <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">{card.icon}<span className="text-xs text-muted-foreground">{card.label}</span></div>
                <div className="text-xl font-bold text-foreground">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
              <AlertCircle size={14} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-foreground">Acquisition Cost per Referral</h3>
              <span className="text-xs text-muted-foreground ml-auto">Lower cost = more efficient referrer</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Referrer</th>
                    <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Code</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Referrals</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Converted</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Credits Issued</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Acq. Cost</th>
                    <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground">Conv. Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {adminMetrics.sort((a, b) => a.acquisition_cost_inr - b.acquisition_cost_inr).map(m => (
                    <tr key={m.referral_code} className="border-t border-border hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-foreground">{m.referrer_email}</td>
                      <td className="px-5 py-3 font-mono text-xs text-primary">{m.referral_code}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{m.total_referrals}</td>
                      <td className="px-5 py-3 text-right text-emerald-600 font-medium">{m.converted}</td>
                      <td className="px-5 py-3 text-right text-violet-600 font-medium">{m.credits_awarded}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold ${m.acquisition_cost_inr < 300 ? 'text-emerald-600' : m.acquisition_cost_inr < 500 ? 'text-amber-600' : 'text-red-600'}`}>
                          {fmtINR(m.acquisition_cost_inr)}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${m.conversion_rate}%` }} />
                          </div>
                          <span className="text-xs font-medium text-foreground">{m.conversion_rate.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
