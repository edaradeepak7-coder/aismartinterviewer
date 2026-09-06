'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { CreditCard, Calendar, Users, TrendingUp, Download, ExternalLink, CheckCircle, AlertCircle, Clock, RefreshCw, Loader2, BarChart2, DollarSign, Zap, Shield, FileText, ArrowUpRight, ToggleLeft, ToggleRight, Package, Receipt, Star, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subscription {
  id: string;
  plan: string;
  tier: 'Starter' | 'Professional' | 'Enterprise';
  status: 'active' | 'expiring_soon' | 'expired' | 'cancelled';
  total_seats: number;
  used_seats: number;
  price_per_seat: number;
  billing_cycle: 'monthly' | 'annual';
  start_date: string;
  renewal_date: string;
  auto_renewal: boolean;
  features: string[];
}

interface SeatUsageRecord {
  month: string;
  seats_used: number;
  seats_total: number;
  cost: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  seats: number;
  status: 'paid' | 'pending' | 'overdue';
  description: string;
  download_url?: string;
}

interface UpgradeOption {
  tier: 'Professional' | 'Enterprise';
  seats: number;
  price_monthly: number;
  price_annual: number;
  features: string[];
  popular?: boolean;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
const mockSubscription: Subscription = {
  id: 'sub-001',
  plan: 'Institution Professional',
  tier: 'Professional',
  status: 'active',
  total_seats: 100,
  used_seats: 67,
  price_per_seat: 499,
  billing_cycle: 'annual',
  start_date: '2026-08-01',
  renewal_date: '2027-08-01',
  auto_renewal: true,
  features: [
    'Up to 100 candidate seats',
    '500 AI interactions/month (interviews, coaching, Q&A)',
    '300 voice minutes/month (ElevenLabs TTS/STT)',
    '5,000 emails/month (Brevo)',
    '25 GB storage',
    'Detailed performance analytics',
    'Placement drive management',
    'Priority support (12h SLA)',
    'Custom branding',
    'Bulk candidate import',
    'API access',
    'Overage: ₹12/extra AI interaction, ₹1.5/extra voice min',
  ],
};

const mockUsageHistory: SeatUsageRecord[] = [
  { month: 'Mar 2026', seats_used: 42, seats_total: 100, cost: 12558 },
  { month: 'Apr 2026', seats_used: 51, seats_total: 100, cost: 15249 },
  { month: 'May 2026', seats_used: 58, seats_total: 100, cost: 17342 },
  { month: 'Jun 2026', seats_used: 60, seats_total: 100, cost: 17940 },
  { month: 'Jul 2026', seats_used: 63, seats_total: 100, cost: 18837 },
  { month: 'Aug 2026', seats_used: 67, seats_total: 100, cost: 20033 },
];

const mockInvoices: Invoice[] = [
  { id: 'inv-1', invoice_number: 'INV-2026-0801', date: '2026-08-01', amount: 29900, seats: 100, status: 'paid', description: 'Annual subscription — Institution Professional (100 seats)' },
  { id: 'inv-2', invoice_number: 'INV-2026-0601', date: '2026-06-01', amount: 5980, seats: 20, status: 'paid', description: 'Seat top-up — 20 additional seats' },
  { id: 'inv-3', invoice_number: 'INV-2026-0401', date: '2026-04-01', amount: 2990, seats: 10, status: 'paid', description: 'Seat top-up — 10 additional seats' },
  { id: 'inv-4', invoice_number: 'INV-2025-0801', date: '2025-08-01', amount: 23920, seats: 80, status: 'paid', description: 'Annual subscription — Institution Starter (80 seats)' },
];

const upgradeOptions: UpgradeOption[] = [
  {
    tier: 'Professional',
    seats: 200,
    price_monthly: 999,
    price_annual: 9990,
    popular: true,
    features: [
      '200 candidate seats',
      '500 AI interactions/month',
      '300 voice minutes/month (ElevenLabs)',
      '5,000 emails/month (Brevo)',
      '25 GB storage',
      'Advanced analytics',
      'Custom question banks',
      'Dedicated account manager',
      'SLA 99.7%',
      '~$350/mo infra reserve',
    ],
  },
  {
    tier: 'Enterprise',
    seats: 500,
    price_monthly: 2499,
    price_annual: 24990,
    features: [
      '500 candidate seats',
      '2,000+ AI interactions/month',
      '1,000+ voice minutes/month (ElevenLabs)',
      '25,000+ emails/month (Brevo)',
      '100 GB storage',
      'White-label branding',
      'SSO integration',
      'Custom AI models',
      'SLA 99.9%',
      'On-premise option',
      '~$600/mo infra reserve',
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Subscription['status'] }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
    expiring_soon: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    expired: 'bg-red-400/15 text-red-400 border-red-400/25',
    cancelled: 'bg-muted text-muted-foreground border-border',
  };
  const labels: Record<string, string> = {
    active: 'Active', expiring_soon: 'Expiring Soon', expired: 'Expired', cancelled: 'Cancelled',
  };
  return (
    <span className={`text-xs font-600 px-2.5 py-1 rounded-full border ${map[status]}`}>{labels[status]}</span>
  );
}

function InvoiceStatusBadge({ status }: { status: Invoice['status'] }) {
  const map: Record<string, string> = {
    paid: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
    pending: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    overdue: 'bg-red-400/15 text-red-400 border-red-400/25',
  };
  return (
    <span className={`text-xs font-600 px-2 py-0.5 rounded-full border capitalize ${map[status]}`}>{status}</span>
  );
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = Math.min((used / total) * 100, 100);
  const color = pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400';
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{used} / {total} seats used</span>
        <span className={`font-700 ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
type Tab = 'overview' | 'usage' | 'invoices' | 'upgrade';

export default function InstitutionSubscriptionContent() {
  const { user } = useAuth();
  const supabase = createClient();

  const [subscription, setSubscription] = useState<Subscription>(mockSubscription);
  const [usageHistory, setUsageHistory] = useState<SeatUsageRecord[]>(mockUsageHistory);
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [autoRenewal, setAutoRenewal] = useState(mockSubscription.auto_renewal);
  const [renewalToggling, setRenewalToggling] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: inst } = await supabase
        .from('institutions')
        .select('*')
        .eq('admin_user_id', user.id)
        .maybeSingle();

      if (inst) {
        setSubscription(prev => ({
          ...prev,
          total_seats: inst.total_seats || prev.total_seats,
          used_seats: inst.used_seats || prev.used_seats,
          auto_renewal: inst.auto_renewal ?? prev.auto_renewal,
          renewal_date: inst.renewal_date || prev.renewal_date,
        }));
        setAutoRenewal(inst.auto_renewal ?? mockSubscription.auto_renewal);
      }

      const { data: txns } = await supabase
        .from('seat_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (txns && txns.length > 0) {
        setInvoices(txns.map((t: any, i: number) => ({
          id: t.id,
          invoice_number: `INV-${new Date(t.created_at).getFullYear()}-${String(i + 1).padStart(4, '0')}`,
          date: t.created_at,
          amount: t.amount,
          seats: t.seats_requested,
          status: t.status === 'completed' ? 'paid' : t.status === 'pending_verification' ? 'pending' : 'pending',
          description: `Seat ${t.payment_method === 'online' ? 'purchase' : 'top-up'} — ${t.seats_requested} seats`,
        })));
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleRenewal = async () => {
    setRenewalToggling(true);
    try {
      const { error } = await supabase
        .from('institutions')
        .update({ auto_renewal: !autoRenewal })
        .eq('admin_user_id', user?.id);
      if (error) throw error;
      setAutoRenewal(r => !r);
      showToast(`Auto-renewal ${!autoRenewal ? 'enabled' : 'disabled'}.`, 'success');
    } catch {
      showToast('Failed to update auto-renewal setting.', 'error');
    } finally {
      setRenewalToggling(false);
    }
  };

  const daysLeft = daysUntil(subscription.renewal_date);
  const unusedSeats = subscription.total_seats - subscription.used_seats;
  const utilizationPct = Math.round((subscription.used_seats / subscription.total_seats) * 100);
  const costPerActiveSeat = subscription.used_seats > 0
    ? Math.round((subscription.price_per_seat * subscription.total_seats) / subscription.used_seats)
    : 0;
  const monthlyBurnRate = Math.round((subscription.price_per_seat * subscription.used_seats) / 12);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'usage', label: 'Seat Usage', icon: <Users size={14} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={14} /> },
    { id: 'upgrade', label: 'Upgrade', icon: <Zap size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Subscription Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your institution's plan, seats, and billing</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Active plan banner */}
      <div className={`rounded-2xl border p-6 ${
        daysLeft <= 30 ? 'border-amber-400/30 bg-amber-400/5' : 'border-primary/20 bg-primary/5'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Package size={22} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-700 text-foreground">{subscription.plan}</h2>
              <StatusBadge status={subscription.status} />
            </div>
            <div className="flex items-center gap-4 mt-1 flex-wrap text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar size={13} /> Renews {formatDate(subscription.renewal_date)}</span>
              <span className="flex items-center gap-1.5"><Clock size={13} />
                {daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
              </span>
              <span className="flex items-center gap-1.5"><CreditCard size={13} /> {subscription.billing_cycle === 'annual' ? 'Annual' : 'Monthly'} billing</span>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-2xl font-800 text-foreground tabular-nums">{formatCurrency(subscription.price_per_seat * subscription.total_seats)}</p>
              <p className="text-xs text-muted-foreground">/{subscription.billing_cycle}</p>
            </div>
          </div>
        </div>

        {daysLeft <= 30 && daysLeft > 0 && (
          <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-400/10 border border-amber-400/25 rounded-lg text-xs text-amber-400">
            <AlertTriangle size={12} /> Your subscription renews in {daysLeft} days. Ensure auto-renewal is enabled or make a manual payment.
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-500 whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm border border-border'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          {/* Metric cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Active Seats', value: subscription.used_seats, sub: `of ${subscription.total_seats} total`, color: 'text-emerald-400', icon: <Users size={16} className="text-emerald-400" /> },
              { label: 'Unused Seats', value: unusedSeats, sub: `${100 - utilizationPct}% idle`, color: 'text-amber-400', icon: <Package size={16} className="text-amber-400" /> },
              { label: 'Monthly Burn', value: formatCurrency(monthlyBurnRate), sub: 'active seat cost', color: 'text-blue-400', icon: <TrendingUp size={16} className="text-blue-400" /> },
              { label: 'Cost/Active Seat', value: formatCurrency(costPerActiveSeat), sub: 'effective rate', color: 'text-primary', icon: <DollarSign size={16} className="text-primary" /> },
            ].map(m => (
              <div key={m.label} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">{m.label}</p>
                  {m.icon}
                </div>
                <p className={`text-xl font-700 tabular-nums ${m.color}`}>{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Seat usage bar */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
              <Users size={15} className="text-primary" /> Seat Utilization
            </h3>
            <UsageBar used={subscription.used_seats} total={subscription.total_seats} />
            {utilizationPct >= 85 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                <AlertCircle size={12} /> Approaching seat limit. Consider upgrading your plan.
              </div>
            )}
          </div>

          {/* Auto-renewal & plan features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
                <RefreshCw size={15} className="text-primary" /> Auto-Renewal
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-foreground font-500">{autoRenewal ? 'Enabled' : 'Disabled'}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {autoRenewal
                      ? `Will renew on ${formatDate(subscription.renewal_date)}`
                      : 'Subscription will expire without renewal'}
                  </p>
                </div>
                <button
                  onClick={handleToggleRenewal}
                  disabled={renewalToggling}
                  className="shrink-0"
                >
                  {renewalToggling
                    ? <Loader2 size={22} className="animate-spin text-muted-foreground" />
                    : autoRenewal
                      ? <ToggleRight size={28} className="text-primary" />
                      : <ToggleLeft size={28} className="text-muted-foreground" />
                  }
                </button>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
                <Star size={15} className="text-primary" /> Plan Features
              </h3>
              <ul className="space-y-2">
                {subscription.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                    <CheckCircle size={11} className="text-emerald-400 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-600 text-foreground">Monthly Seat Usage History</h3>
              <span className="text-xs text-muted-foreground">{usageHistory.length} months</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">S.No</th>
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Month</th>
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Seats Used</th>
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Total Seats</th>
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Utilization</th>
                    <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {usageHistory.map((row, i) => {
                    const pct = Math.round((row.seats_used / row.seats_total) * 100);
                    return (
                      <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-3.5 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-5 py-3.5 font-500 text-foreground">{row.month}</td>
                        <td className="px-5 py-3.5 text-foreground tabular-nums">{row.seats_used}</td>
                        <td className="px-5 py-3.5 text-muted-foreground tabular-nums">{row.seats_total}</td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${pct >= 90 ? 'bg-red-400' : pct >= 75 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-600 tabular-nums ${pct >= 90 ? 'text-red-400' : pct >= 75 ? 'text-amber-400' : 'text-emerald-400'}`}>{pct}%</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-600 text-foreground tabular-nums">{formatCurrency(row.cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Trend chart (visual bars) */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
              <TrendingUp size={15} className="text-primary" /> Seat Usage Trend
            </h3>
            <div className="flex items-end gap-2 h-32">
              {usageHistory.map((row, i) => {
                const pct = (row.seats_used / row.seats_total) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground tabular-nums">{row.seats_used}</span>
                    <div className="w-full rounded-t-md transition-all duration-700 bg-primary/70 hover:bg-primary"
                      style={{ height: `${(pct / 100) * 96}px` }} />
                    <span className="text-[9px] text-muted-foreground text-center leading-tight">{row.month.split(' ')[0]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-600 text-foreground">Invoices & Receipts</h3>
            <span className="text-xs text-muted-foreground">{invoices.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">S.No</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Invoice #</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Date</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Description</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Seats</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Amount</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Status</th>
                  <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv, i) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{i + 1}</td>
                    <td className="px-5 py-3.5 font-600 text-foreground text-xs font-mono">{inv.invoice_number}</td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs">{formatDate(inv.date)}</td>
                    <td className="px-5 py-3.5 text-foreground text-xs max-w-[200px] truncate">{inv.description}</td>
                    <td className="px-5 py-3.5 text-foreground tabular-nums">{inv.seats}</td>
                    <td className="px-5 py-3.5 font-700 text-foreground tabular-nums">{formatCurrency(inv.amount)}</td>
                    <td className="px-5 py-3.5"><InvoiceStatusBadge status={inv.status} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                          <Download size={11} /> Download
                        </button>
                        <span className="text-muted-foreground/30">|</span>
                        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                          <FileText size={11} /> View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upgrade Tab */}
      {activeTab === 'upgrade' && (
        <div className="space-y-5">
          <div className="bg-amber-400/5 border border-amber-400/20 rounded-xl px-5 py-4 flex items-center gap-3">
            <Zap size={16} className="text-amber-400 shrink-0" />
            <p className="text-sm text-foreground">
              You're currently on <strong>{subscription.plan}</strong>. Upgrade to unlock more seats and advanced features.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {upgradeOptions.map(opt => (
              <div key={opt.tier} className={`bg-card border rounded-2xl p-6 relative ${opt.popular ? 'border-primary/40' : 'border-border'}`}>
                {opt.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white text-xs font-700 px-3 py-1 rounded-full">Most Popular</span>
                  </div>
                )}
                <div className="mb-4">
                  <h3 className="text-base font-700 text-foreground">{opt.tier}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.seats} candidate seats</p>
                </div>
                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-800 text-foreground tabular-nums">{formatCurrency(opt.price_annual)}</span>
                    <span className="text-xs text-muted-foreground">/year</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(opt.price_monthly)}/month billed monthly</p>
                </div>
                <ul className="space-y-2 mb-5">
                  {opt.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-foreground">
                      <CheckCircle size={11} className="text-emerald-400 shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <button className={`w-full py-2.5 rounded-xl text-sm font-600 transition-all flex items-center justify-center gap-2 ${
                  opt.popular
                    ? 'bg-primary text-white hover:bg-primary/90' :'bg-muted text-foreground hover:bg-muted/70 border border-border'
                }`}>
                  Upgrade to {opt.tier} <ArrowUpRight size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Shield size={18} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-600 text-foreground">Need a custom plan?</p>
              <p className="text-xs text-muted-foreground mt-0.5">Contact our sales team for custom seat counts, white-label options, and enterprise pricing.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-500 text-foreground hover:border-primary/40 transition-all shrink-0">
              Contact Sales <ExternalLink size={13} />
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-500 shadow-lg ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.type === 'success' ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
