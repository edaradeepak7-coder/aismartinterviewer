'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard, Calendar, Users, TrendingUp, RefreshCw, Loader2, BarChart2,
  DollarSign, Package, Receipt, AlertCircle, AlertTriangle, CheckCircle,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const SEAT_PRICE_PER_UNIT = 299;

interface Subscription {
  id: string;
  plan: string;
  status: 'active' | 'pending' | 'suspended' | 'expired';
  total_seats: number;
  used_seats: number;
  price_per_seat: number;
  approved_at?: string;
}

interface SeatUsageRecord {
  month: string;
  seats_added: number;
  amount: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  date: string;
  amount: number;
  seats: number;
  status: 'paid' | 'pending' | 'overdue' | 'failed';
  description: string;
}

function formatCurrency(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function mapInstitutionStatus(status: string): Subscription['status'] {
  if (status === 'approved') return 'active';
  if (status === 'suspended' || status === 'rejected') return 'suspended';
  if (status === 'pending') return 'pending';
  return 'pending';
}

function mapTxnStatus(status: string): Invoice['status'] {
  if (status === 'completed') return 'paid';
  if (status === 'failed' || status === 'rejected') return 'failed';
  if (status === 'pending_verification' || status === 'pending') return 'pending';
  return 'pending';
}

function StatusBadge({ status }: { status: Subscription['status'] }) {
  const map: Record<string, string> = {
    active: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/25',
    pending: 'bg-amber-400/15 text-amber-400 border-amber-400/25',
    suspended: 'bg-red-400/15 text-red-400 border-red-400/25',
    expired: 'bg-muted text-muted-foreground border-border',
  };
  const labels: Record<string, string> = {
    active: 'Active', pending: 'Pending', suspended: 'Suspended', expired: 'Expired',
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
    failed: 'bg-red-400/15 text-red-400 border-red-400/25',
  };
  return (
    <span className={`text-xs font-600 px-2 py-0.5 rounded-full border capitalize ${map[status]}`}>{status}</span>
  );
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0;
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

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="px-5 py-12 text-center">
      <p className="text-sm font-600 text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{detail}</p>
    </div>
  );
}

type Tab = 'overview' | 'usage' | 'invoices' | 'upgrade';

export default function InstitutionSubscriptionContent() {
  const { user } = useAuth();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usageHistory, setUsageHistory] = useState<SeatUsageRecord[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);
    try {
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('email, role')
        .eq('id', user.id)
        .maybeSingle();

      let instRow: any = null;
      if (profile?.role === 'institution_admin' && profile.email) {
        const { data } = await supabase
          .from('institutions')
          .select('*')
          .eq('email', profile.email)
          .maybeSingle();
        instRow = data;
      } else {
        const { data } = await supabase
          .from('institutions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        instRow = data;
      }

      if (!instRow) {
        setSubscription(null);
        setInvoices([]);
        setUsageHistory([]);
        setLoadError('No institution linked to this account. Match the institution email to your login, or register one.');
        return;
      }

      setSubscription({
        id: instRow.id,
        plan: instRow.plan || 'Institution Basic',
        status: mapInstitutionStatus(instRow.status || 'pending'),
        total_seats: instRow.total_seats || 0,
        used_seats: instRow.used_seats || 0,
        price_per_seat: SEAT_PRICE_PER_UNIT,
        approved_at: instRow.approved_at || undefined,
      });

      const txnRes = await fetch(`/api/institutions/seat-transactions?institution_id=${instRow.id}`);
      const txnJson = await txnRes.json().catch(() => ({}));
      const txns: any[] = Array.isArray(txnJson.transactions) ? txnJson.transactions : [];

      const mappedInvoices: Invoice[] = txns.map((t, i) => {
        const amountPaise = typeof t.amount_paise === 'number' ? t.amount_paise : 0;
        return {
          id: t.id,
          invoice_number: `INV-${new Date(t.created_at).getFullYear()}-${String(i + 1).padStart(4, '0')}`,
          date: t.created_at,
          amount: Math.round(amountPaise / 100),
          seats: t.seats_requested || 0,
          status: mapTxnStatus(t.status || 'pending'),
          description: `Seat ${t.payment_method === 'online' ? 'purchase' : 'top-up'} — ${t.seats_requested || 0} seats`,
        };
      });
      setInvoices(mappedInvoices);

      const byMonth = new Map<string, SeatUsageRecord>();
      for (const t of txns) {
        if (t.status !== 'completed') continue;
        const d = new Date(t.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
        const amountPaise = typeof t.amount_paise === 'number' ? t.amount_paise : 0;
        const prev = byMonth.get(key) || { month: label, seats_added: 0, amount: 0 };
        prev.seats_added += t.seats_requested || 0;
        prev.amount += Math.round(amountPaise / 100);
        byMonth.set(key, prev);
      }
      setUsageHistory(
        Array.from(byMonth.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, v]) => v),
      );
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load subscription data.');
      setSubscription(null);
      setInvoices([]);
      setUsageHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalSeats = subscription?.total_seats ?? 0;
  const usedSeats = subscription?.used_seats ?? 0;
  const unusedSeats = Math.max(0, totalSeats - usedSeats);
  const utilizationPct = totalSeats > 0 ? Math.round((usedSeats / totalSeats) * 100) : 0;
  const seatPoolValue = totalSeats * SEAT_PRICE_PER_UNIT;
  const monthlyBurnRate = usedSeats * SEAT_PRICE_PER_UNIT;

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart2 size={14} /> },
    { id: 'usage', label: 'Seat Purchases', icon: <Users size={14} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={14} /> },
    { id: 'upgrade', label: 'Buy Seats', icon: <Package size={14} /> },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-700 text-foreground">Subscription Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Live seat pool and billing for your institution</p>
        </div>
        <button onClick={fetchData} className="p-2 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !subscription && (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 size={18} className="animate-spin" /> Loading subscription…
        </div>
      )}

      {loadError && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-600">Unable to load subscription</p>
            <p className="text-xs mt-0.5 opacity-90">{loadError}</p>
          </div>
        </div>
      )}

      {subscription && (
        <>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
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
                  {subscription.approved_at && (
                    <span className="flex items-center gap-1.5">
                      <Calendar size={13} /> Approved {formatDate(subscription.approved_at)}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CreditCard size={13} /> ₹{SEAT_PRICE_PER_UNIT}/seat
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users size={13} /> {usedSeats}/{totalSeats} seats used
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-2xl font-800 text-foreground tabular-nums">{formatCurrency(seatPoolValue)}</p>
                <p className="text-xs text-muted-foreground">seat pool value</p>
              </div>
            </div>
          </div>

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

          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Active Seats', value: usedSeats, sub: `of ${totalSeats} total`, color: 'text-emerald-400', icon: <Users size={16} className="text-emerald-400" /> },
                  { label: 'Unused Seats', value: unusedSeats, sub: totalSeats > 0 ? `${100 - utilizationPct}% idle` : 'No seats yet', color: 'text-amber-400', icon: <Package size={16} className="text-amber-400" /> },
                  { label: 'Seat Cost Rate', value: formatCurrency(monthlyBurnRate), sub: 'used seats × unit price', color: 'text-blue-400', icon: <TrendingUp size={16} className="text-blue-400" /> },
                  { label: 'Unit Price', value: formatCurrency(SEAT_PRICE_PER_UNIT), sub: 'per seat', color: 'text-primary', icon: <DollarSign size={16} className="text-primary" /> },
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

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-600 text-foreground mb-4 flex items-center gap-2">
                  <Users size={15} className="text-primary" /> Seat Utilization
                </h3>
                {totalSeats === 0 ? (
                  <EmptyState title="No seats allocated" detail="Purchase seats from the Buy Seats tab or Institution Admin." />
                ) : (
                  <>
                    <UsageBar used={usedSeats} total={totalSeats} />
                    {utilizationPct >= 85 && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-amber-400">
                        <AlertCircle size={12} /> Approaching seat limit. Purchase additional seats.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="bg-card border border-border rounded-xl p-5">
                <h3 className="text-sm font-600 text-foreground mb-3 flex items-center gap-2">
                  <CheckCircle size={15} className="text-primary" /> Included with your seat pool
                </h3>
                <ul className="space-y-2 text-xs text-foreground">
                  <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-400 shrink-0" /> {totalSeats} candidate seats allocated</li>
                  <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-400 shrink-0" /> Plan: {subscription.plan}</li>
                  <li className="flex items-center gap-2"><CheckCircle size={11} className="text-emerald-400 shrink-0" /> Seat purchases via Institution Admin (online / offline)</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-600 text-foreground">Completed Seat Purchases by Month</h3>
                <span className="text-xs text-muted-foreground">{usageHistory.length} months</span>
              </div>
              {usageHistory.length === 0 ? (
                <EmptyState title="No completed purchases yet" detail="Completed seat transactions will appear here by month." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">S.No</th>
                        <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Month</th>
                        <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Seats Added</th>
                        <th className="px-5 py-3 text-left text-xs font-600 text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageHistory.map((row, i) => (
                        <tr key={row.month} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3.5 text-muted-foreground text-xs">{i + 1}</td>
                          <td className="px-5 py-3.5 font-500 text-foreground">{row.month}</td>
                          <td className="px-5 py-3.5 text-foreground tabular-nums">{row.seats_added}</td>
                          <td className="px-5 py-3.5 font-600 text-foreground tabular-nums">{formatCurrency(row.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-sm font-600 text-foreground">Seat Transactions</h3>
                <span className="text-xs text-muted-foreground">{invoices.length} records</span>
              </div>
              {invoices.length === 0 ? (
                <EmptyState title="No transactions yet" detail="Seat purchases and top-ups will list here once recorded." />
              ) : (
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'upgrade' && (
            <div className="space-y-5">
              <div className="bg-card border border-border rounded-xl p-6 space-y-3">
                <h3 className="text-base font-700 text-foreground">Buy additional seats</h3>
                <p className="text-sm text-muted-foreground">
                  Seat purchases are handled in Institution Admin at ₹{SEAT_PRICE_PER_UNIT}/seat (online or offline verification).
                  There is no separate plan-upgrade checkout on this page.
                </p>
                <p className="text-sm text-foreground">
                  Current pool: <strong>{usedSeats}/{totalSeats}</strong> seats used · Plan: <strong>{subscription.plan}</strong>
                </p>
                <Link
                  href="/institution-admin"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-600 bg-primary text-white hover:bg-primary/90 transition-all"
                >
                  Open Institution Admin
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
